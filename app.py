from flask import Flask, request, jsonify
from flask_cors import CORS

import requests
from bs4 import BeautifulSoup

import json


app = Flask(__name__)

CORS(app)


@app.route("/")
def home():

    return jsonify({
        "status": "RecipeNest backend is running!"
    })


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


    # Look for Recipe structured data
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

        # Direct Recipe object
        if data.get("@type") == "Recipe":

            return data


        # Sometimes @type is a list
        types = data.get("@type", [])

        if isinstance(types, list):

            if "Recipe" in types:

                return data


        # Search @graph
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


    # Some websites return several images.
    # For now we take only the first.
    if isinstance(image, list):

        image = image[0] if image else None


    # Sometimes image is an object.
    if isinstance(image, dict):

        image = image.get("url")


    ingredients = data.get(
        "recipeIngredient",
        []
    )


    instructions = extract_instructions(
        data.get("recipeInstructions", [])
    )


    return {

        "name":
            data.get("name", "").strip(),

        "image":
            image,

        "ingredients":
            ingredients,

        "instructions":
            instructions,

        "prepTime":
            data.get("prepTime", ""),

        "cookTime":
            data.get("cookTime", ""),

        "totalTime":
            data.get("totalTime", ""),

        "servings":
            data.get("recipeYield", ""),

        "url":
            url

    }


def extract_instructions(instructions):

    if isinstance(instructions, str):

        return instructions


    result = []


    for item in instructions:

        if isinstance(item, str):

            result.append(item)


        elif isinstance(item, dict):

            text = item.get("text")

            if text:

                result.append(text)


            # Handle HowToSection
            elif item.get("@type") == "HowToSection":

                steps = item.get(
                    "itemListElement",
                    []
                )

                for step in steps:

                    if isinstance(step, dict):

                        text = step.get("text")

                        if text:

                            result.append(text)


    return "\n\n".join(result)


if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )
