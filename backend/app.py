from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

import json
import io


app = Flask(__name__)

CORS(app)

@app.route('/')
def serve_index():
    # Try multiple paths
    if os.path.exists('index.html'):
        return send_from_directory('.', 'index.html')
    elif os.path.exists('../index.html'):
        return send_from_directory('..', 'index.html')
    elif os.path.exists('../recipedatabase/index.html'):
        return send_from_directory('../recipedatabase', 'index.html')
    else:
        return "index.html not found!", 404

@app.route('/<path:filename>')
def serve_static(filename):
    if os.path.exists(filename):
        return send_from_directory('.', filename)
    elif os.path.exists(f'../{filename}'):
        return send_from_directory('..', filename)
    else:
        return f"{filename} not found!", 404

# =========================================
# HOME
# =========================================

@app.route("/")
def home():

    return jsonify({
        "status": "RecipeDatabase backend is running!"
    })


# =========================================
# WEBSITE RECIPE IMPORT
# =========================================

@app.route("/import-recipe", methods=["POST"])
def import_recipe():

    data = request.get_json()

    if not data or "url" not in data:

        return jsonify({
            "error": "Please provide a recipe URL."
        }), 400


    url = data["url"].strip()


    if not url.startswith(("http://", "https://")):

        return jsonify({
            "error": "Invalid URL."
        }), 400


    try:

        response = requests.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 "
                    "(Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 "
                    "Chrome/131.0 Safari/537.36"
                )
            },
            timeout=15
        )

        response.raise_for_status()

    except requests.RequestException as error:

        return jsonify({
            "error": f"Could not access the website: {error}"
        }), 400


    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )


    recipe_data = find_recipe_data(soup)


    if not recipe_data:

        return jsonify({
            "error": (
                "No recipe information was found "
                "on this webpage."
            )
        }), 404


    recipe = extract_recipe(
        recipe_data,
        url
    )


    return jsonify(recipe)


# =========================================
# PDF IMPORT
# =========================================

@app.route("/import-pdf", methods=["POST"])
def import_pdf():

    if "file" not in request.files:

        return jsonify({
            "error": "No PDF file was uploaded."
        }), 400


    file = request.files["file"]


    if file.filename == "":

        return jsonify({
            "error": "No file was selected."
        }), 400


    if not file.filename.lower().endswith(".pdf"):

        return jsonify({
            "error": "Please select a PDF file."
        }), 400


    try:

        pdf_bytes = file.read()

        reader = PdfReader(
            io.BytesIO(pdf_bytes)
        )


        pages = []


        for page in reader.pages:

            text = page.extract_text()

            if text:

                pages.append(text)


        full_text = "\n\n".join(pages)


        if not full_text.strip():

            return jsonify({
                "error": (
                    "This PDF does not contain "
                    "selectable text. It may be a scanned PDF."
                )
            }), 400


        return jsonify({

            "filename": file.filename,

            "text": full_text

        })


    except Exception as error:

        return jsonify({
            "error": f"Could not read PDF: {error}"
        }), 400

# =========================================
# import url
# =========================================
@app.route("/import-url", methods=["POST"])
def import_url():

    try:

        data = request.get_json()

        url = data.get("url", "").strip()


        if not url:

            return jsonify({
                "error":
                    "Please provide a recipe URL."
            })


        if not (
            url.startswith("http://")
            or
            url.startswith("https://")
        ):

            return jsonify({
                "error":
                    "Please enter a complete URL beginning with https://"
            })


        headers = {

            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 "
                "Chrome/120.0 Safari/537.36"

        }


        response = requests.get(
            url,
            headers=headers,
            timeout=15
        )


        response.raise_for_status()


        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )


        name = ""

        ingredients = []

        instructions = []


        # =====================================
        # LOOK FOR RECIPE SCHEMA DATA
        # =====================================

        scripts = soup.find_all(
            "script",
            type="application/ld+json"
        )


        for script in scripts:

            if not script.string:

                continue


            try:

                json_data = json.loads(
                    script.string
                )

            except:

                continue


            recipe_data = find_recipe_schema(
                json_data
            )


            if recipe_data:

                name = (
                    recipe_data.get("name", "")
                )


                ingredients = (
                    recipe_data.get(
                        "recipeIngredient",
                        []
                    )
                )


                raw_instructions = (
                    recipe_data.get(
                        "recipeInstructions",
                        []
                    )
                )


                instructions = parse_instructions(
                    raw_instructions
                )


                break


        # =====================================
        # FALLBACK TITLE
        # =====================================

        if not name:

            if soup.title:

                name = soup.title.get_text(
                    strip=True
                )


        # =====================================
        # SOURCE NAME
        # =====================================

        source_name = ""


        site_name_tag = soup.find(
            "meta",
            property="og:site_name"
        )


        if site_name_tag:

            source_name = (
                site_name_tag.get(
                    "content",
                    ""
                )
            )


        # =====================================
        # CHECK WHETHER WE FOUND A RECIPE
        # =====================================

        if (
            not ingredients
            and
            not instructions
        ):

            return jsonify({
                "error":
                    "RecipeNest could not find recipe information on this page. You can still add it manually."
            })


        return jsonify({

            "name": name,

            "ingredients":
                ingredients,

            "instructions":
                "\n".join(
                    instructions
                ),

            "url": url,

            "sourceName":
                source_name

        })


    except requests.exceptions.RequestException:

        return jsonify({
            "error":
                "RecipeNest could not open this website."
        })


    except Exception as error:

        print(error)

        return jsonify({
            "error":
                "Something went wrong while importing this recipe."
        })



# =========================================
# RECIPE JSON-LD FUNCTIONS
# =========================================

def find_recipe_data(soup):

    scripts = soup.find_all(
        "script",
        type="application/ld+json"
    )


    for script in scripts:

        try:

            data = json.loads(
                script.string or script.get_text()
            )

        except (json.JSONDecodeError, TypeError):

            continue


        result = search_for_recipe(data)


        if result:

            return result


    return None


def search_for_recipe(data):

    if isinstance(data, dict):

        if data.get("@type") == "Recipe":

            return data


        types = data.get("@type", [])


        if isinstance(types, list):

            if "Recipe" in types:

                return data


        if "@graph" in data:

            result = search_for_recipe(
                data["@graph"]
            )

            if result:

                return result


    elif isinstance(data, list):

        for item in data:

            result = search_for_recipe(item)

            if result:

                return result


    return None


def extract_recipe(data, url):

    image = data.get("image")


    if isinstance(image, list):

        image = image[0] if image else None


    if isinstance(image, dict):

        image = image.get("url")


    ingredients = data.get(
        "recipeIngredient",
        []
    )


    instructions = extract_instructions(
        data.get(
            "recipeInstructions",
            []
        )
    )


    return {

        "name":
            data.get(
                "name",
                ""
            ).strip(),

        "image":
            image,

        "ingredients":
            ingredients,

        "instructions":
            instructions,

        "prepTime":
            data.get(
                "prepTime",
                ""
            ),

        "cookTime":
            data.get(
                "cookTime",
                ""
            ),

        "totalTime":
            data.get(
                "totalTime",
                ""
            ),

        "servings":
            data.get(
                "recipeYield",
                ""
            ),

        "url":
            url

    }


def extract_instructions(instructions):

    if isinstance(
        instructions,
        str
    ):

        return instructions


    result = []


    for item in instructions:

        if isinstance(
            item,
            str
        ):

            result.append(item)


        elif isinstance(
            item,
            dict
        ):

            text = item.get("text")


            if text:

                result.append(text)


            elif item.get(
                "@type"
            ) == "HowToSection":

                steps = item.get(
                    "itemListElement",
                    []
                )


                for step in steps:

                    if isinstance(
                        step,
                        dict
                    ):

                        text = step.get(
                            "text"
                        )


                        if text:

                            result.append(
                                text
                            )


    return "\n\n".join(result)

def find_recipe_schema(data):


    if isinstance(data, dict):


        data_type = data.get("@type")


        if isinstance(data_type, list):

            if "Recipe" in data_type:

                return data


        elif data_type == "Recipe":

            return data


        if "@graph" in data:

            result = find_recipe_schema(
                data["@graph"]
            )

            if result:

                return result


        for value in data.values():

            if isinstance(
                value,
                (dict, list)
            ):

                result = find_recipe_schema(
                    value
                )

                if result:

                    return result


    elif isinstance(data, list):


        for item in data:

            result = find_recipe_schema(
                item
            )

            if result:

                return result


    return None

def parse_instructions(items):


    result = []


    if isinstance(items, str):

        return [items]


    if not isinstance(items, list):

        return result


    for item in items:


        if isinstance(item, str):

            result.append(
                item.strip()
            )


        elif isinstance(item, dict):


            item_type = item.get(
                "@type",
                ""
            )


            # Individual instruction

            if (
                item_type == "HowToStep"
                or
                "text" in item
            ):

                text = item.get(
                    "text",
                    ""
                )


                if text:

                    result.append(
                        text.strip()
                    )


            # Group of instructions

            elif (
                item_type == "HowToSection"
            ):

                sub_items = item.get(
                    "itemListElement",
                    []
                )


                result.extend(
                    parse_instructions(
                        sub_items
                    )
                )


            # Sometimes nested
            # instructions appear here

            elif "itemListElement" in item:

                result.extend(
                    parse_instructions(
                        item[
                            "itemListElement"
                        ]
                    )
                )


    return result
# =========================================
# START SERVER
# =========================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )
