let db;

let recipes = [];

let currentRecipe = 0;

let editingId = null;


/* =========================================
   DATABASE
========================================= */

const request =
    indexedDB.open(
        "RecipeNestDB",
        1
    );


request.onupgradeneeded =
    function(event) {

        db = event.target.result;

        if (
            !db.objectStoreNames
            .contains("recipes")
        ) {

            db.createObjectStore(
                "recipes",
                {
                    keyPath: "id",
                    autoIncrement: true
                }
            );

        }

    };


request.onsuccess =
    function(event) {

        db = event.target.result;

        loadRecipes();

    };


request.onerror =
    function() {

        alert(
            "Unable to open your recipe book."
        );

    };


/* =========================================
   LOAD
========================================= */

function loadRecipes() {

    const transaction =
        db.transaction(
            ["recipes"],
            "readonly"
        );


    const store =
        transaction.objectStore(
            "recipes"
        );


    const request =
        store.getAll();


    request.onsuccess =
        function() {

            recipes =
                request.result;

            displayRecipe();

        };

}


/* =========================================
   NAVIGATION
========================================= */

function hideAll() {

    document
        .getElementById("bookPage")
        .classList.add("hidden");

    document
        .getElementById("addPage")
        .classList.add("hidden");

    document
        .getElementById("searchPage")
        .classList.add("hidden");

}


function showBook() {

    hideAll();

    document
        .getElementById("bookPage")
        .classList.remove("hidden");

    displayRecipe();

}


function showAdd() {

    hideAll();

    document
        .getElementById("addPage")
        .classList.remove("hidden");

}


function showSearch() {

    hideAll();

    document
        .getElementById("searchPage")
        .classList.remove("hidden");

    searchRecipes();

}


/* =========================================
   ADD OPTIONS
========================================= */

function showPDFImport() {

    document
        .getElementById("pdfImportArea")
        .classList.remove("hidden");

    document
        .getElementById("manualForm")
        .classList.add("hidden");

    document
        .getElementById("urlImportArea")
        .classList.add("hidden");

}


function showManualForm() {

    document
        .getElementById("manualForm")
        .classList.remove("hidden");

    document
        .getElementById("pdfImportArea")
        .classList.add("hidden");

    document
        .getElementById("urlImportArea")
        .classList.add("hidden");

}


function showURLImport() {

    document
        .getElementById("urlImportArea")
        .classList.remove("hidden");

    document
        .getElementById("manualForm")
        .classList.add("hidden");

    document
        .getElementById("pdfImportArea")
        .classList.add("hidden");

}


/* =========================================
   PDF IMPORT
========================================= */

async function importPDF() {

    const file =
        document
        .getElementById("pdfFile")
        .files[0];


    const status =
        document
        .getElementById("pdfStatus");


    if (!file) {

        status.innerText =
            "Please choose a PDF first.";

        return;

    }


    status.innerText =
        "Reading your PDF...";


    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    try {

        const response =
            await fetch(
                "/import-pdf",
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await response.json();


        if (data.error) {

            status.innerText =
               status.innerText = data.error;

            return;

        }


        /*
         * For now we put the extracted
         * text into the editing form.
         *
         * We will make the parser smarter
         * later.
         */

        showManualForm();


        document
            .getElementById("inputName")
            .value =
            guessRecipeName(
                data.text,
                file.name
            );


        document
            .getElementById("inputIngredients")
            .value =
            extractIngredients(
                data.text
            );


        document
            .getElementById("inputInstructions")
            .value =
            data.text;


        alert(
            "PDF imported. Please review and edit the recipe before saving."
        );


    }

    catch(error) {

        status.innerText =
            "Could not connect to RecipeDatabase.";

        console.error(error);

    }

}

/* =========================================
   WEBSITE IMPORT
========================================= */

async function importWebsite() {

    const url =
        document
        .getElementById(
            "websiteURL"
        )
        .value
        .trim();


    const status =
        document
        .getElementById(
            "websiteStatus"
        );


    if (!url) {

        status.innerText =
            "Please enter a recipe URL.";

        return;

    }


    status.innerText =
        "Looking for the recipe...";


    try {

        const response =
            await fetch(
                "/import-url",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            url: url
                        })
                }
            );


        const data =
            await response.json();


        if (data.error) {

            status.innerText =
                data.error;

            return;

        }


        /*
         * Open the manual form
         * and fill it with the
         * imported recipe.
         */

        showAdd();

        showManualForm();


        document
            .getElementById(
                "inputName"
            )
            .value =
            data.name || "";


        document
            .getElementById(
                "inputURL"
            )
            .value =
            data.url || url;


        document
            .getElementById(
                "inputSourceName"
            )
            .value =
            data.sourceName || "";


        document
            .getElementById(
                "inputIngredients"
            )
            .value =
            (data.ingredients || [])
            .join("\n");


        document
            .getElementById(
                "inputInstructions"
            )
            .value =
            data.instructions || "";


        /*
         * Story and Kitchen Notes
         * are personal fields,
         * so leave them blank.
         */

        document
            .getElementById(
                "inputStory"
            )
            .value = "";


        document
            .getElementById(
                "inputNotes"
            )
            .value = "";


        status.innerText =
            "";


        alert(
            "Recipe imported. Please review it before saving."
        );


    }

    catch (error) {

        console.error(error);

        status.innerText =
            "Could not connect to RecipeDatabase. Make sure Flask is running.";

    }

}


/* =========================================
   BASIC PDF HELPERS
========================================= */

function guessRecipeName(
    text,
    filename
) {

    const lines =
        text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);


    if (lines.length > 0) {

        return lines[0];

    }


    return filename
        .replace(".pdf", "");

}


function extractIngredients(text) {

    const lines =
        text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);


    const start =
        lines.findIndex(
            line =>
                line
                .toLowerCase()
                .includes("ingredient")
        );


    if (start === -1) {

        return "";

    }


    const result = [];


    for (
        let i = start + 1;
        i < lines.length;
        i++
    ) {

        const line =
            lines[i];


        if (
            line
            .toLowerCase()
            .includes("instruction")
        ) {

            break;

        }


        result.push(line);

    }


    return result.join("\n");

}


/* =========================================
   SAVE RECIPE
========================================= */

function saveRecipe() {

    const name =
        document
        .getElementById("inputName")
        .value
        .trim();


    const ingredients =
        document
        .getElementById(
            "inputIngredients"
        )
        .value
        .split("\n")
        .filter(
            x => x.trim() !== ""
        );


    const instructions =
        document
        .getElementById(
            "inputInstructions"
        )
        .value
        .trim();


    if (!name) {

        alert(
            "Please enter a recipe name."
        );

        return;

    }


    if (
        ingredients.length === 0
    ) {

        alert(
            "Please enter the ingredients."
        );

        return;

    }


    if (!instructions) {

        alert(
            "Please enter the instructions."
        );

        return;

    }


    const file =
        document
        .getElementById("inputImage")
        .files[0];


    if (editingId !== null) {

        updateRecipe(
            editingId,
            file
        );

        return;

    }


    const recipe = {

        name: name,

        category:
            document
            .getElementById(
                "inputCategory"
            )
            .value,

        url:
            document
            .getElementById(
                "inputURL"
            )
            .value
            .trim(),

       sourceName:
          document
          .getElementById(
              "inputSourceName"
          )
          .value
          .trim(),

        image: null,

        ingredients:
            ingredients,

        instructions:
            instructions,

        story:
            document
                .getElementById("inputStory")
                .value
                .trim(),

        notes:
            document
                .getElementById("inputNotes")
                .value
                .trim(),

        dateSaved:
            new Date().toISOString()

    };


    if (file) {

        const reader =
            new FileReader();


        reader.onload =
            function(event) {

                recipe.image =
                    event.target.result;

                addRecipeToDatabase(
                    recipe
                );

            };


        reader.readAsDataURL(file);

    }

    else {

        addRecipeToDatabase(
            recipe
        );

    }

}


/* =========================================
   DATABASE ADD
========================================= */

function addRecipeToDatabase(
    recipe
) {

    const transaction =
        db.transaction(
            ["recipes"],
            "readwrite"
        );


    const store =
        transaction.objectStore(
            "recipes"
        );


    const request =
        store.add(recipe);


    request.onsuccess =
        function() {

            editingId = null;

            loadRecipes();

            clearForm();

            showBook();

            alert(
                "Recipe saved!"
            );

        };

}


/* =========================================
   DISPLAY
========================================= */

function displayRecipe() {

    if (
        recipes.length === 0
    ) {

        document
            .getElementById(
                "recipeTitle"
            )
            .innerText =
            "Your Cookbook is Empty";


        document
            .getElementById(
                "recipeCategory"
            )
            .innerText = "";


        document
            .getElementById(
                "recipeIngredients"
            )
            .innerHTML = "";


        document
            .getElementById(
                "recipeInstructions"
            )
            .innerText =
            "Add your first recipe.";


        document
            .getElementById(
                "pageNumber"
            )
            .innerText =
            "0 / 0";


        return;

    }


    const recipe =
        recipes[currentRecipe];


    document
        .getElementById(
            "recipeTitle"
        )
        .innerText =
        recipe.name;


    document
        .getElementById(
            "recipeCategory"
        )
        .innerText =
        recipe.category;


    document
        .getElementById(
            "recipeTime"
        )
        .innerText =
        recipe.time
        ? "⏱ " + recipe.time
        : "";


    document
        .getElementById(
            "recipeServings"
        )
        .innerText =
        recipe.servings
        ? "🍽 " + recipe.servings
        : "";


    const image =
        document
        .getElementById(
            "recipeImage"
        );


    if (recipe.image) {

        image.src =
            recipe.image;

    }

    else {

        image.src = "";

    }

    // ===== INGREDIENTS: Bullet points for lines with numbers/measurements =====
    const ingredientsContainer = document.getElementById("recipeIngredients");
    ingredientsContainer.innerHTML = "";

    if (recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(item => {
            const trimmed = String(item).trim();
            if (trimmed === "") return;

            // Check for ANY number (not just at start), or measurement words
            const hasNumber = /\d/.test(trimmed);
            const hasMeasurement = /tbsp|cup|tsp|g|ml|oz|lb|kg|gram|ounce|pound|packet|stick/i.test(trimmed);

            // Check if it's a section header (like "For the dough", "For the glaze")
            const isSectionHeader = /^for the /i.test(trimmed);

            // Check if it's a measurement with parentheses like "(280g)" or "(1 packet / 7g)"
            const hasParenthesisMeasurement = /\([\d\s\/]+(g|tbsp|tsp|cup|packet|stick|oz|ml)/i.test(trimmed);

            // Check if it has a fraction like ⅓, ½, ¼
            const hasFraction = /[½¼⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(trimmed);

            // Should have bullet if it has any number OR measurement OR fraction
            const shouldHaveBullet = (hasNumber || hasMeasurement || hasParenthesisMeasurement || hasFraction) && !isSectionHeader;

            if (shouldHaveBullet) {
                const li = document.createElement("li");
                li.textContent = trimmed;
                ingredientsContainer.appendChild(li);
            } else {
                const p = document.createElement("p");
                p.textContent = trimmed;
                p.style.margin = "4px 0";
                p.style.padding = "2px 0";
                if (isSectionHeader) {
                    p.style.fontWeight = "bold";
                }
                ingredientsContainer.appendChild(p);
            }
        });
    } else {
        ingredientsContainer.innerHTML = "";
    }


    // ===== INSTRUCTIONS: NO bullet points, just plain text =====
    const instructionsContainer = document.getElementById("recipeInstructions");
    instructionsContainer.innerHTML = "";

    if (recipe.instructions) {
        const instructionLines = String(recipe.instructions)
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (instructionLines.length > 0) {
            instructionLines.forEach(line => {
                const p = document.createElement("p");
                p.textContent = line;
                p.style.margin = "4px 0";
                p.style.padding = "2px 0";
                instructionsContainer.appendChild(p);
            });
        } else {
            instructionsContainer.textContent = recipe.instructions;
        }
    }

    document
        .getElementById(
            "recipeStory"
        )
        .innerText =
        recipe.story || "";


    document
        .getElementById(
            "recipeNotes"
        )
        .innerText =
        recipe.notes || "";


    const url =
        document
        .getElementById(
            "recipeURL"
        );


    if (recipe.url) {

        url.href =
            recipe.url;

        url.innerText =
           recipe.sourceName ||
           recipe.url;

        url.style.display =
            "inline-block";

    }

    else {

        url.style.display =
            "none";

    }


    document
        .getElementById(
            "pageNumber"
        )
        .innerText =
        `${currentRecipe + 1} / ${recipes.length}`;

}


/* =========================================
   PAGE TURNING
========================================= */

function nextRecipe() {

    if (
        recipes.length === 0
    ) return;


    currentRecipe++;


    if (
        currentRecipe >=
        recipes.length
    ) {

        currentRecipe = 0;

    }


    displayRecipe();

}


function previousRecipe() {

    if (
        recipes.length === 0
    ) return;


    currentRecipe--;


    if (
        currentRecipe < 0
    ) {

        currentRecipe =
            recipes.length - 1;

    }


    displayRecipe();

}


/* =========================================
   SEARCH
========================================= */

function searchRecipes() {

    const search =
        document
        .getElementById(
            "searchInput"
        )
        .value
        .toLowerCase()
        .trim();


    const category =
        document
        .getElementById(
            "categoryFilter"
        )
        .value;


    const results =
        recipes.filter(
            recipe => {

                const nameMatch =
                    recipe.name
                    .toLowerCase()
                    .includes(search);


                const categoryMatch =
                    category === "All" ||
                    recipe.category === category;


                return (
                    nameMatch &&
                    categoryMatch
                );

            }
        );


    const container =
        document
        .getElementById(
            "searchResults"
        );


    container.innerHTML = "";


    if (
        results.length === 0
    ) {

        container.innerHTML =
            "<p>No recipes found.</p>";

        return;

    }


    results.forEach(
        recipe => {

            const div =
                document
                .createElement(
                    "div"
                );


            div.className =
                "search-result";


            div.innerHTML = `
                <strong>
                    ${escapeHTML(recipe.name)}
                </strong>

                <small>
                    ${escapeHTML(recipe.category)}
                </small>
            `;


            div.onclick =
                function() {

                    currentRecipe =
                        recipes.findIndex(
                            r =>
                                r.id ===
                                recipe.id
                        );


                    showBook();

                };


            container.appendChild(
                div
            );

        }
    );

}


/* =========================================
   EDIT
========================================= */

function editCurrentRecipe() {

    if (recipes.length === 0) return;


    const recipe =
        recipes[currentRecipe];


    editingId =
        recipe.id;


    /* Go to Add Recipe page */

    showAdd();

    showManualForm();


    /* Fill in the form */

    document
        .getElementById("inputName")
        .value =
        recipe.name || "";


    document
        .getElementById("inputCategory")
        .value =
        recipe.category || "Breakfast";

    document
        .getElementById(
            "inputStory"
        )
        .value =
        recipe.story || "";


    document
        .getElementById("inputURL")
        .value =
        recipe.url || "";

   document
       .getElementById("inputSourceName")
       .value =
        recipe.sourceName || "";

    document
        .getElementById("inputIngredients")
        .value =
        (recipe.ingredients || [])
            .join("\n");


    document
        .getElementById("inputInstructions")
        .value =
        recipe.instructions || "";

    document
        .getElementById(
            "inputNotes"
        )
        .value =
        recipe.notes || "";
}

/* =========================================
   UPDATE
========================================= */

function updateRecipe(
    id,
    file
) {

    const transaction =
        db.transaction(
            ["recipes"],
            "readwrite"
        );


    const store =
        transaction.objectStore(
            "recipes"
        );


    const getRequest =
        store.get(id);


    getRequest.onsuccess =
        function() {

            const recipe =
                getRequest.result;


            recipe.name =
                document
                .getElementById(
                    "inputName"
                )
                .value
                .trim();


            recipe.category =
                document
                .getElementById(
                    "inputCategory"
                )
                .value;

            recipe.story =
                document
                    .getElementById(
                        "inputStory"
                    )
                    .value
                    .trim();

            recipe.url =
                document
                .getElementById(
                    "inputURL"
                )
                .value
                .trim();

            recipe.sourceName =
               document
               .getElementById(
                 "inputSourceName"
               )
               .value
               .trim();

            recipe.ingredients =
                document
                .getElementById(
                    "inputIngredients"
                )
                .value
                .split("\n")
                .filter(
                    x =>
                        x.trim() !== ""
                );


            recipe.instructions =
                document
                .getElementById(
                    "inputInstructions"
                )
                .value
                .trim();

            recipe.notes =
                document
                    .getElementById(
                        "inputNotes"
                    )
                    .value
                    .trim();

            if (file) {

                const reader =
                    new FileReader();


                reader.onload =
                    function(event) {

                        recipe.image =
                            event.target.result;

                        saveUpdatedRecipe(
                            recipe
                        );

                    };


                reader.readAsDataURL(
                    file
                );

            }

            else {

                saveUpdatedRecipe(
                    recipe
                );

            }

        };

}


function saveUpdatedRecipe(
    recipe
) {

    const transaction =
        db.transaction(
            ["recipes"],
            "readwrite"
        );


    const store =
        transaction.objectStore(
            "recipes"
        );


    store.put(recipe);


    transaction.oncomplete =
        function() {

            editingId = null;

            loadRecipes();

            clearForm();

            showBook();

        };

}


/* =========================================
   DELETE
========================================= */

function deleteCurrentRecipe() {

    if (
        recipes.length === 0
    ) return;


    const recipe =
        recipes[currentRecipe];


    if (
        !confirm(
            `Delete "${recipe.name}"?`
        )
    ) return;


    const transaction =
        db.transaction(
            ["recipes"],
            "readwrite"
        );


    const store =
        transaction.objectStore(
            "recipes"
        );


    store.delete(
        recipe.id
    );


    transaction.oncomplete =
        function() {

            currentRecipe =
                Math.max(
                    0,
                    currentRecipe - 1
                );

            loadRecipes();

        };

}


/* =========================================
   CLEAR FORM
========================================= */

function clearForm() {

    document
        .getElementById(
            "inputName"
        )
        .value = "";


    document
        .getElementById(
            "inputURL"
        )
        .value = "";

    document
       .getElementById(
           "inputSourceName"
       )
       .value = "";

    document
        .getElementById(
            "inputIngredients"
        )
        .value = "";


    document
        .getElementById(
            "inputInstructions"
        )
        .value = "";


    document
        .getElementById(
            "inputImage"
        )
        .value = "";

}


/* =========================================
   PRINT
========================================= */

function printRecipe() {

    window.print();

}


/* =========================================
   SECURITY
========================================= */

function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;

}

/* =========================================
   BACKUP RECIPES
========================================= */

function exportRecipes() {

    if (recipes.length === 0) {

        alert("There are no recipes to back up.");

        return;

    }

    const backup = {

        app: "Recipe Database",

        exportedAt:
            new Date().toISOString(),

        recipes: recipes

    };


    const json =
        JSON.stringify(
            backup,
            null,
            2
        );


    const blob =
        new Blob(
            [json],
            {
                type: "application/json"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href =
        url;


    link.download =
        "recipe-database-backup.json";


    document.body.appendChild(
        link
    );


    link.click();


    document.body.removeChild(
        link
    );


    URL.revokeObjectURL(
        url
    );


    alert(
        "Your recipe backup has been downloaded."
    );

}
