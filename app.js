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
           
           populateTagSuggestions();

           populateTagFilter();

           displayRecipe();

        };

}
/* =========================================
   TAGS HELPERS
========================================= */

function parseTagsInput(value) {

    const seen = new Set();

    return String(value || "")
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag !== "")
        .filter(tag => {

            const key = tag.toLowerCase();

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;

        });

}


function populateTagSuggestions() {

    const datalist =
        document
        .getElementById(
            "tagSuggestions"
        );

    if (!datalist) return;

    datalist.innerHTML = "";

    const unique =
        new Set();

    recipes.forEach(
        recipe => {

            (recipe.tags || [])
                .forEach(
                    tag =>
                        unique.add(tag)
                );

        }
    );

    Array.from(unique)
        .sort(
            (a, b) =>
                a.localeCompare(b)
        )
        .forEach(
            tag => {

                const option =
                    document
                    .createElement(
                        "option"
                    );

                option.value =
                    tag;

                datalist
                    .appendChild(
                        option
                    );

            }
        );

}


function populateTagFilter() {

    /*
     * The tag filter is now a text input
     * with autocomplete suggestions, so
     * there is no <select> to populate.
     *
     * We still keep this function name so
     * loadRecipes() can call it, and so we
     * can refresh an open suggestion list
     * if the underlying tags change.
     */

    const input =
        document
        .getElementById(
            "tagFilterInput"
        );

    if (!input) return;

    if (
        document.activeElement === input
    ) {

        onTagFilterInput();

    }

}


/* =========================================
   TAG FILTER (search page)
========================================= */

let selectedTag = "";


function getAllTags() {

    const unique =
        new Set();

    recipes.forEach(
        recipe => {

            (recipe.tags || [])
                .forEach(
                    tag =>
                        unique.add(tag)
                );

        }
    );

    return Array.from(unique)
        .sort(
            (a, b) =>
                a.localeCompare(b)
        );

}


function onTagFilterInput() {

    const input =
        document
        .getElementById(
            "tagFilterInput"
        );

    const box =
        document
        .getElementById(
            "tagFilterSuggestions"
        );

    if (!input || !box) return;

    const query =
        input.value
        .trim()
        .toLowerCase();

    /*
     * If the user is typing freely, we
     * treat the input as a loose search
     * until they pick a suggestion.
     */

    if (query === "") {

        selectedTag = "";

    }

    else if (
        query !==
        selectedTag.toLowerCase()
    ) {

        selectedTag = "";

    }

    const matches =
        getAllTags()
        .filter(
            tag =>
                query === "" ||
                tag
                .toLowerCase()
                .includes(query)
        );

    box.innerHTML = "";

    if (matches.length === 0) {

        box.classList.add("hidden");

    }

    else {

        box.classList.remove("hidden");

        matches.forEach(
            tag => {

                const div =
                    document
                    .createElement(
                        "div"
                    );

                div.className =
                    "tag-suggestion";

                div.textContent =
                    tag;

                div.onclick =
                    function() {

                        selectTagSuggestion(
                            tag
                        );

                    };

                box.appendChild(div);

            }
        );

    }

    updateTagClearButton();

    searchRecipes();

}


function selectTagSuggestion(tag) {

    const input =
        document
        .getElementById(
            "tagFilterInput"
        );

    const box =
        document
        .getElementById(
            "tagFilterSuggestions"
        );

    if (!input || !box) return;

    selectedTag = tag;

    input.value = tag;

    box.innerHTML = "";

    box.classList.add("hidden");

    updateTagClearButton();

    searchRecipes();

}


function clearTagFilter() {

    const input =
        document
        .getElementById(
            "tagFilterInput"
        );

    const box =
        document
        .getElementById(
            "tagFilterSuggestions"
        );

    selectedTag = "";

    if (input) input.value = "";

    if (box) {

        box.innerHTML = "";

        box.classList.add("hidden");

    }

    updateTagClearButton();

    searchRecipes();

}


function updateTagClearButton() {

    const clearBtn =
        document
        .getElementById(
            "tagFilterClear"
        );

    const input =
        document
        .getElementById(
            "tagFilterInput"
        );

    if (!clearBtn || !input) return;

    if (input.value.trim() === "") {

        clearBtn.classList.add("hidden");

    }

    else {

        clearBtn.classList.remove("hidden");

    }

}


/* Close suggestions when clicking outside */

document.addEventListener(
    "click",
    function(event) {

        const wrap =
            document.querySelector(
                ".tag-filter-wrap"
            );

        const box =
            document
            .getElementById(
                "tagFilterSuggestions"
            );

        if (!wrap || !box) return;

        if (!wrap.contains(event.target)) {

            box.classList.add("hidden");

        }

    }
);
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
   MAIN MENU (three-dot)
========================================= */

function toggleMainMenu(event) {

    if (event) {
        event.stopPropagation();
    }

    const menu =
        document
        .getElementById(
            "mainMenu"
        );

    const trigger =
        document
        .getElementById(
            "mainMenuButton"
        );

    if (!menu) return;

    const isHidden =
        menu.classList.contains(
            "hidden"
        );

    if (isHidden) {

        menu.classList.remove(
            "hidden"
        );

        if (trigger) {

            trigger.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    }

    else {

        closeMainMenu();

    }

}


function closeMainMenu() {

    const menu =
        document
        .getElementById(
            "mainMenu"
        );

    const trigger =
        document
        .getElementById(
            "mainMenuButton"
        );

    if (menu) {

        menu.classList.add(
            "hidden"
        );

    }

    if (trigger) {

        trigger.setAttribute(
            "aria-expanded",
            "false"
        );

    }

}


/* Close the menu when clicking outside it */

document.addEventListener(
    "click",
    function(event) {

        const wrap =
            document.querySelector(
                ".menu-wrap"
            );

        if (!wrap) return;

        if (!wrap.contains(event.target)) {

            closeMainMenu();

        }

    }
);


/* =========================================
   MENU ACTIONS
========================================= */

function menuBackupRestore() {

    /*
     * Close the three-dot menu itself,
     * then show a second small menu
     * with three clear choices.
     */

    closeMainMenu();


    const popup =
        document
        .getElementById(
            "backupRestorePopup"
        );

    if (!popup) return;


    popup.classList.remove(
        "hidden"
    );


    /* Give the user a way out if they
       click somewhere else on the page. */

    setTimeout(
        function() {

            document.addEventListener(
                "click",
                closeBackupRestorePopupOnce
            );

        },
        0
    );

}


function closeBackupRestorePopup() {

    const popup =
        document
        .getElementById(
            "backupRestorePopup"
        );

    if (popup) {

        popup.classList.add(
            "hidden"
        );

    }

    document.removeEventListener(
        "click",
        closeBackupRestorePopupOnce
    );

}


function closeBackupRestorePopupOnce(event) {

    const popup =
        document
        .getElementById(
            "backupRestorePopup"
        );

    if (!popup) return;

    if (!popup.contains(event.target)) {

        closeBackupRestorePopup();

    }

}


function backupRestoreBackup() {

    closeBackupRestorePopup();

    exportRecipes();

}


function backupRestoreRestore() {

    closeBackupRestorePopup();

    const fileInput =
        document
        .getElementById(
            "restoreFile"
        );

    if (fileInput) {

        fileInput.click();

    }

}


function menuMakeCookbook() {

    closeMainMenu();

    alert(
        "Cookbook creation coming soon."
    );

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
   GOOGLE RECIPE SEARCH (helper for URL import)
========================================= */

function searchGoogleForRecipe() {

    const input =
        document
        .getElementById(
            "googleSearchInput"
        );

    const status =
        document
        .getElementById(
            "googleSearchStatus"
        );

    if (!input || !status) return;

    const phrase =
        input.value
        .trim();

    if (phrase === "") {

        status.innerText =
            "Type what you're looking for first, e.g. \"Korean beef\".";

        return;

    }

    status.innerText = "";

    const query =
        encodeURIComponent(
            phrase + " recipe"
        );

    window.open(
        "https://www.google.com/search?q=" + query,
        "_blank",
        "noopener,noreferrer"
    );

    status.innerText =
        "Google opened in a new tab. Find a recipe, copy its URL, then paste it below.";

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
      
       tags:
           parseTagsInput(
           document
           .getElementById(
               "inputTags"
            )
            .value
            ),

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

function addRecipeToDatabase(recipe) {

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
        async function() {

            // Save a copy to Supabase
            try {

                const response =
                    await fetch(
                        "/save-recipe",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(recipe)
                        }
                    );

                const result =
                    await response.json();

                console.log(
                    "Supabase result:",
                    result
                );

            }

            catch (error) {

                console.error(
                    "Supabase save failed:",
                    error
                );

            }

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
                "recipeCategory"
            )
            .innerText = "";
       
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

    const recipeTags =
        document
        .getElementById(
            "recipeTags"
        );

    recipeTags.innerHTML = "";

    (recipe.tags || [])
        .forEach(
            function(tag) {

                const span =
                    document
                    .createElement(
                        "span"
                    );

                span.textContent =
                    tag;

                recipeTags
                    .appendChild(
                        span
                    );

            }
        );

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


   const tag =
        selectedTag;

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


                const tagMatch =
                    tag === "" ||
                    (recipe.tags || [])
                    .includes(tag);


                return (
                    nameMatch &&
                    categoryMatch &&
                    tagMatch
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
        .getElementById("inputTags")
        .value =
        (recipe.tags || [])
            .join(", ");
   
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
           
            recipe.tags =
                parseTagsInput(
                    document
                    .getElementById(
                        "inputTags"
                    )
                    .value
                );

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
           "inputTags"
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

/* =========================================
   RESTORE RECIPES
========================================= */

function importRecipes(event) {

    const file =
        event.target.files[0];


    if (!file) {

        return;

    }


    const reader =
        new FileReader();


    reader.onload =
        function(e) {

            try {

                const backup =
                    JSON.parse(
                        e.target.result
                    );


                if (
                    !backup.recipes ||
                    !Array.isArray(
                        backup.recipes
                    )
                ) {

                    alert(
                        "This does not appear to be a valid Recipe Database backup."
                    );

                    return;

                }


                if (
                    !confirm(
                        `Restore ${backup.recipes.length} recipes?\n\nExisting recipes will be kept.`
                    )
                ) {

                    return;

                }


                const transaction =
                    db.transaction(
                        ["recipes"],
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        "recipes"
                    );


                backup.recipes.forEach(
                    recipe => {

                        /*
                         * Remove the old ID so IndexedDB
                         * creates a new one if needed.
                         */

                        const restoredRecipe =
                            {
                                ...recipe
                            };


                        delete restoredRecipe.id;


                        store.add(
                            restoredRecipe
                        );

                    }
                );


                transaction.oncomplete =
                    function() {

                        loadRecipes();


                        alert(
                            `${backup.recipes.length} recipes restored successfully.`
                        );


                        event.target.value =
                            "";

                    };


                transaction.onerror =
                    function() {

                        alert(
                            "There was a problem restoring the recipes."
                        );

                    };

            }

            catch (error) {

                console.error(error);


                alert(
                    "Could not read this backup file."
                );

            }

        };


    reader.readAsText(file);

}
async function testCloudRecipes() {
    try {
        const response = await fetch("/get-recipe");
        const result = await response.json();

        console.log("Recipes from Supabase:", result);

    } catch (error) {
        console.error("Cloud recipe test failed:", error);
    }
}

testCloudRecipes();
