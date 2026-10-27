import argparse
import json
import os
import re
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


LIST_URL = "https://de.wikipedia.org/wiki/Liste_der_FCI-Hunderassen"
COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php"
HEADERS = {"User-Agent": "FCIBreedDataBot/1.0 (local research script)"}


def text_of(element):
    return element.get_text(" ", strip=True) if element else ""


def parse_fci_table(soup):
    for table in soup.select("table.wikitable"):
        headers = [text_of(cell).lower() for cell in table.select("tr th")]
        if "rasse" in headers and "gruppe/sektion" in headers:
            return table
    raise ValueError("FCI-Tabelle in der Wikipedia-Liste nicht gefunden.")


def parse_list_entries(soup):
    table = parse_fci_table(soup)
    entries = []
    for row in table.select("tr"):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 9:
            continue

        link = cells[0].find("a", href=True)
        match = re.fullmatch(r"\s*(\d+)\s*", text_of(cells[2]))
        group_section = re.fullmatch(
            r"\s*(\d+)\s*/\s*(\d+(?:\.\d+)*)\s*", text_of(cells[1])
        )
        if not link or not match or not group_section:
            continue

        standard_number = int(match.group(1))
        if standard_number < 1:
            continue

        entries.append(
            {
                "fci_nummer": standard_number,
                "name": text_of(link),
                "herkunftsland": text_of(cells[8]) or None,
                "gruppe": int(group_section.group(1)),
                "sektion": group_section.group(2),
                "url": urljoin(LIST_URL, link["href"]),
            }
        )

    return sorted(entries, key=lambda entry: entry["fci_nummer"])


def parse_measurements(soup):
    infobox = soup.select_one("table.infobox")
    measurements = {"groesse": None, "gewicht": None}
    if not infobox:
        return measurements

    labels = {
        "widerristhöhe": "groesse",
        "größe": "groesse",
        "schulterhöhe": "groesse",
        "gewicht": "gewicht",
    }
    for row in infobox.select("tr"):
        cells = row.find_all(["th", "td"], recursive=False)
        if len(cells) < 2:
            continue
        label = re.sub(r"\s+", "", text_of(cells[0]).rstrip(":"))
        key = labels.get(label.lower())
        if key and measurements[key] is None:
            measurements[key] = text_of(cells[1]) or None

    return measurements


def parse_image_urls(soup, page_url):
    image = soup.select_one('meta[property="og:image"][content]')
    image_url = image.get("content") if image else None
    if not image_url:
        image = soup.select_one("table.infobox img[src]")
        image_url = image.get("src") if image else None
    image_url = urljoin(page_url, image_url) if image_url else None
    return image_url, image_url


def search_commons_image(session, breed_name):
    response = session.get(
        COMMONS_API_URL,
        params={
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": f"{breed_name} dog",
            "gsrnamespace": 6,
            "gsrlimit": 5,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": 800,
        },
        timeout=30,
    )
    response.raise_for_status()
    pages = response.json().get("query", {}).get("pages", {}).values()
    pages = sorted(pages, key=lambda page: page.get("index", 0))
    image_info = next(
        (page["imageinfo"][0] for page in pages if page.get("imageinfo")),
        {},
    )
    return image_info.get("url"), image_info.get("thumburl")


def write_json(path, breeds):
    output_path = Path(path)
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=output_path.parent,
            prefix=f".{output_path.name}.",
            suffix=".tmp",
            delete=False,
        ) as output_file:
            temporary_path = Path(output_file.name)
            json.dump(breeds, output_file, ensure_ascii=False, indent=2)
            output_file.write("\n")
        os.replace(temporary_path, output_path)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()


def main():
    parser = argparse.ArgumentParser(
        description="Erstellt einen JSON-Datenabzug der FCI-Hunderassen von Wikipedia."
    )
    parser.add_argument("-o", "--output", default="fci_hunderassen.json")
    parser.add_argument(
        "--normalized-output",
        default="fci_hunderassen_normalisiert.json",
        help="Ergänzt diese Spieldatei um Wikipedia- und Bild-URLs.",
    )
    parser.add_argument(
        "--delay", type=float, default=0.5, help="Pause zwischen Artikelabrufen in Sekunden."
    )
    args = parser.parse_args()

    session = requests.Session()
    session.headers.update(HEADERS)
    response = session.get(LIST_URL, timeout=30)
    response.raise_for_status()
    entries = parse_list_entries(BeautifulSoup(response.text, "html.parser"))
    normalized_path = Path(args.normalized_output)
    normalized_breeds = []
    if normalized_path.exists():
        with normalized_path.open(encoding="utf-8") as normalized_file:
            normalized_breeds = json.load(normalized_file)
    normalized_by_number = {
        breed["fci_nummer"]: breed for breed in normalized_breeds
    }

    breeds = []
    write_json(args.output, breeds)
    for index, entry in enumerate(entries):
        if index:
            time.sleep(max(0, args.delay))
        page_url = entry["url"]
        image_url = None
        image_thumbnail_url = None
        try:
            response = session.get(page_url, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            measurements = parse_measurements(soup)
            image_url, image_thumbnail_url = parse_image_urls(soup, page_url)
        except requests.RequestException as error:
            print(
                f"Warnung: {entry['name']} (FCI {entry['fci_nummer']}): {error}",
                file=sys.stderr,
            )
            measurements = {"groesse": None, "gewicht": None}

        if not image_url:
            try:
                image_url, image_thumbnail_url = search_commons_image(
                    session, entry["name"]
                )
            except requests.RequestException as error:
                print(
                    f"Warnung: Kein Bild für {entry['name']} gefunden: {error}",
                    file=sys.stderr,
                )

        breed = {
            **entry,
            **measurements,
            "url": page_url,
            "image_url": image_url,
            "image_thumbnail_url": image_thumbnail_url,
        }
        breeds.append(breed)
        write_json(args.output, breeds)
        normalized_breed = normalized_by_number.get(entry["fci_nummer"])
        if normalized_breed:
            normalized_breed.update(
                {
                    "url": page_url,
                    "image_url": image_url,
                    "image_thumbnail_url": image_thumbnail_url,
                }
            )
            write_json(args.normalized_output, normalized_breeds)
        print(
            f"[{index + 1}/{len(entries)}] {entry['name']}"
            f" ({'Bild gefunden' if image_url else 'kein Bild'})",
            file=sys.stderr,
        )

    print(f"{len(breeds)} Rassen nach {args.output} geschrieben.")


if __name__ == "__main__":
    main()