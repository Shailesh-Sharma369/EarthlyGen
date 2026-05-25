// document.addEventListener("DOMContentLoaded", function () {
//   // Sample data for demonstration
//   const sampleData = [
//     "Bags",
//     "Eco-brush",
//     "Eco-friendly soap",
//     "Hand Sanitizer",
//     "Eco-Water Bottles",
//     "Bamboo-Products",
//     "FaceWash",
//     "Natural Oil",
//     "Medicinal Products",
//     "HandCraft Eco-Products",
//     "Solar-powered-Products",
//     "Indowud Eco-Friendly Products",
//   ];

//   const searchInput = document.querySelector(".search-input");
//   const clearButton = document.querySelector(".clear-button");
//   const resultsContainer = document.querySelector(".results-container");

//   // Function to filter and display results
//   function filterResults(query) {
//     // Clear previous results
//     resultsContainer.innerHTML = "";

//     if (!query) {
//       resultsContainer.classList.remove("active");
//       return;
//     }

//     // Filter the data based on query
//     const filteredResults = sampleData.filter((item) =>
//       item.toLowerCase().includes(query.toLowerCase())
//     );

//     // Show results container if we have matches
//     if (filteredResults.length > 0) {
//       resultsContainer.classList.add("active");

//       // Add results to the container
//       filteredResults.forEach((item) => {
//         const resultItem = document.createElement("div");
//         resultItem.classList.add("result-item");

//         // Highlight the matching part
//         const regex = new RegExp(`(${query})`, "gi");
//         const highlightedText = item.replace(
//           regex,
//           '<span class="highlight">$1</span>'
//         );

//         resultItem.innerHTML = highlightedText;

//         // Handle click on result
//         resultItem.addEventListener("click", () => {
//           searchInput.value = item;
//           resultsContainer.classList.remove("active");
//           clearButton.style.display = "block";
//         });

//         resultsContainer.appendChild(resultItem);
//       });
//     } else {
//       // Show "no results" message
//       resultsContainer.classList.add("active");
//       const noResults = document.createElement("div");
//       noResults.classList.add("result-item");
//       noResults.textContent = "No results found";
//       resultsContainer.appendChild(noResults);
//     }
//   }

//   // Show/hide clear button based on input
//   searchInput.addEventListener("input", function () {
//     const query = this.value.trim();

//     if (query) {
//       clearButton.style.display = "block";
//     } else {
//       clearButton.style.display = "none";
//     }

//     filterResults(query);
//   });

//   // Clear the search input
//   clearButton.addEventListener("click", function () {
//     searchInput.value = "";
//     clearButton.style.display = "none";
//     resultsContainer.classList.remove("active");
//     searchInput.focus();
//   });

//   // Close results when clicking outside
//   document.addEventListener("click", function (event) {
//     if (!event.target.closest(".search-container")) {
//       resultsContainer.classList.remove("active");
//     }
//   });

//   // Prevent form submission
//   searchInput.closest("form")?.addEventListener("submit", function (e) {
//     e.preventDefault();
//   });
// });

// const searchInput = document.querySelector(".search-input");

// searchInput.addEventListener("input", () => {
//   const query = searchInput.value.toLowerCase();
//   const allCards = document.querySelectorAll(".product-card");

//   allCards.forEach((card) => {
//     const title = card
//       .querySelector(".product-title")
//       .textContent.toLowerCase();
//     const category = card
//       .querySelector(".product-category")
//       .textContent.toLowerCase();

//     if (title.includes(query) || category.includes(query)) {
//       card.style.display = "block";
//     } else {
//       card.style.display = "none";
//     }
//   });
// });


document.addEventListener("DOMContentLoaded", function () {

  const searchInput = document.querySelector(".search-input");
  const clearButton = document.querySelector(".clear-button");
  const resultsContainer = document.querySelector(".results-container");

  if (!searchInput) return;

  // Collect products dynamically
  const productCards = document.querySelectorAll(".product-card");
  const sampleData = Array.from(productCards).map(card => {
    const title = card.querySelector(".product-title")?.textContent.trim();
    const category = card.querySelector(".product-category")?.textContent.trim();
    return `${title} (${category})`;
  });

  function filterSuggestions(query) {
    resultsContainer.innerHTML = "";

    if (!query) {
      resultsContainer.classList.remove("active");
      return;
    }

    const filtered = sampleData.filter(item =>
      item.toLowerCase().includes(query)
    );

    resultsContainer.classList.add("active");

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `<div class="result-item">No results found</div>`;
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement("div");
      div.className = "result-item";
      div.textContent = item;
      div.onclick = () => {
        searchInput.value = item;
        resultsContainer.classList.remove("active");
      };
      resultsContainer.appendChild(div);
    });
  }

  function filterProductCards(query) {
    productCards.forEach(card => {
      const text = (
        card.querySelector(".product-title").textContent +
        card.querySelector(".product-category").textContent
      ).toLowerCase();

      card.style.display = text.includes(query) ? "block" : "none";
    });
  }

  function toggleClearButton(query) {
    clearButton.style.display = query ? "block" : "none";
  }

  searchInput.addEventListener("input", function () {
    const query = this.value.trim().toLowerCase();
    toggleClearButton(query);
    filterSuggestions(query);
    filterProductCards(query);
  });

  clearButton.addEventListener("click", function () {
    searchInput.value = "";
    toggleClearButton("");
    resultsContainer.classList.remove("active");
    filterProductCards("");
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".search-container")) {
      resultsContainer.classList.remove("active");
    }
  });
});
