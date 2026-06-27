const API = "";



const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setVerdictPill(el, label, sentiment) {
    el.textContent = label;
    el.classList.remove("positive", "negative");
    if (sentiment === "positive") el.classList.add("positive");
    if (sentiment === "negative") el.classList.add("negative");
}

function sentimentOf(predictionText) {
    const value = (predictionText || "").toString().toLowerCase();
    if (value.includes("pos")) return "positive";
    if (value.includes("neg")) return "negative";
    return null;
}

function ratingBadgeHTML(rating) {
    const value = Number(rating);
    const display = Number.isFinite(value) ? value.toFixed(1) : rating;
    return `<span class="rating-badge"><i class="fa-solid fa-star"></i> ${display}</span>`;
}


const SCAN_SAMPLES = [
    { text: "The biryani was outstanding, rich aroma and perfectly cooked rice.", sentiment: "positive", confidence: 96 },
    { text: "Service was painfully slow and the food arrived cold.", sentiment: "negative", confidence: 91 },
    { text: "Loved the South Indian thali, totally worth the price.", sentiment: "positive", confidence: 94 },
    { text: "Overpriced for the portion size, very disappointing.", sentiment: "negative", confidence: 88 },
    { text: "Great ambience and the staff were genuinely welcoming.", sentiment: "positive", confidence: 92 }
];

async function typeText(el, text, speed = 28) {
    el.textContent = "";
    for (let i = 0; i < text.length; i++) {
        el.textContent += text[i];
        await sleep(speed);
    }
}

async function eraseText(el, speed = 12) {
    const current = el.textContent;
    for (let i = current.length; i >= 0; i--) {
        el.textContent = current.slice(0, i);
        await sleep(speed);
    }
}

async function runScanDemo() {
    const textEl = document.getElementById("scanText");
    const lineEl = document.getElementById("scanLine");
    const pillEl = document.getElementById("verdictPill");
    const confEl = document.getElementById("scanConfidence");

    if (!textEl || !lineEl || !pillEl || !confEl) return;

    let index = 0;

    while (true) {
        const sample = SCAN_SAMPLES[index % SCAN_SAMPLES.length];

        setVerdictPill(pillEl, "scanning…", null);
        confEl.textContent = "--%";

        await typeText(textEl, sample.text);
        await sleep(250);

        lineEl.classList.remove("active");
        // restart animation cleanly
        // eslint-disable-next-line no-unused-expressions
        lineEl.offsetWidth;
        lineEl.classList.add("active");
        await sleep(1100);

        setVerdictPill(
            pillEl,
            sample.sentiment === "positive" ? "positive" : "negative",
            sample.sentiment
        );
        confEl.textContent = sample.confidence + "%";

        await sleep(2600);
        await eraseText(textEl);
        await sleep(300);

        index++;
    }
}


async function analyzeReview() {

    const review = document.getElementById("reviewInput").value.trim();

    if (review === "") {
        alert("Please enter a review.");
        return;
    }

    const predictionEl = document.getElementById("prediction");
    const confidenceEl = document.getElementById("confidence");
    const resultBox = document.getElementById("resultBox");

    predictionEl.textContent = "Analyzing...";
    predictionEl.classList.remove("positive", "negative");
    confidenceEl.textContent = "...";
    resultBox.classList.remove("positive", "negative");

    try {

        const response = await fetch(`${API}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ review: review })
        });

        const data = await response.json();

        predictionEl.textContent = data.prediction;
        confidenceEl.textContent = data.confidence + "%";

        const sentiment = sentimentOf(data.prediction);
        if (sentiment) {
            predictionEl.classList.add(sentiment);
            resultBox.classList.add(sentiment);
        }

    } catch (error) {
        console.log(error);
        alert("Prediction Failed");
    }

}



async function searchRestaurant() {

    const restaurant = document.getElementById("restaurantInput").value.trim();
    const resultEl = document.getElementById("searchResult");

    if (restaurant === "") {
        alert("Enter Restaurant Name");
        return;
    }

    resultEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin-pulse"></i><p>Searching…</p></div>`;

    try {

        const response = await fetch(
            `${API}/search?restaurant=${encodeURIComponent(restaurant)}`
        );

        const data = await response.json();

        if (data.message) {
            resultEl.innerHTML = `<div class="alert alert-danger mb-0">${data.message}</div>`;
            return;
        }

        resultEl.innerHTML = `
            <div class="card-ai">
                <h3>${data.Restaurant} ${ratingBadgeHTML(data["Average Rating"])}</h3>
                <hr>
                <p><strong>Cuisine:</strong> ${data.Cuisine}</p>
                <p><strong>Cost:</strong> ${data.Cost}</p>
                <p><strong>Collections:</strong> ${data.Collections}</p>
                <p><strong>Timings:</strong> ${data.Timings}</p>
                <p><strong>Total Reviews:</strong> ${data.Reviews}</p>
            </div>
        `;

    } catch (error) {
        console.log(error);
        resultEl.innerHTML = `<div class="alert alert-danger mb-0">Something went wrong. Please try again.</div>`;
    }

}



function setupHeroSearch() {

    const form = document.getElementById("heroSearchForm");
    const heroInput = document.getElementById("heroSearchInput");
    const restaurantInput = document.getElementById("restaurantInput");

    if (!form || !heroInput || !restaurantInput) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const value = heroInput.value.trim();
        if (value === "") return;

        restaurantInput.value = value;

        document.getElementById("search").scrollIntoView({ behavior: "smooth", block: "start" });
        searchRestaurant();
    });

}

async function recommendRestaurant() {

    const cuisine = document.getElementById("cuisineInput").value;
    const resultEl = document.getElementById("recommendationResult");

    if (cuisine === "") {
        alert("Choose Cuisine");
        return;
    }

    resultEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin-pulse"></i><p>Finding recommendations…</p></div>`;

    try {

        const response = await fetch(
            `${API}/recommend?cuisine=${encodeURIComponent(cuisine)}`
        );

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            resultEl.innerHTML = `<div class="empty-state"><i class="fa-solid fa-utensils"></i><p>No recommendations found for this cuisine yet.</p></div>`;
            return;
        }

        let html = "";

        data.forEach((item) => {
            html += `
                <div class="card-ai">
                    <h4>${item.Restaurant_review}</h4>
                    <div class="recommend-meta">
                        ${ratingBadgeHTML(item.Average_Rating)}
                        <span>Cost: ${item.Cost}</span>
                    </div>
                </div>
            `;
        });

        resultEl.innerHTML = html;

    } catch (error) {
        console.log(error);
        resultEl.innerHTML = `<div class="alert alert-danger mb-0">Something went wrong. Please try again.</div>`;
    }

}



function setupCuisineChips() {

    const chipsWrap = document.getElementById("cuisineChips");
    const select = document.getElementById("cuisineInput");

    if (!chipsWrap || !select) return;

    chipsWrap.querySelectorAll(".cuisine-chip").forEach((chip) => {
        chip.addEventListener("click", () => {

            chipsWrap.querySelectorAll(".cuisine-chip").forEach((c) => c.classList.remove("active"));
            chip.classList.add("active");

            select.value = chip.dataset.cuisine;
            recommendRestaurant();

        });
    });

    select.addEventListener("change", () => {
        chipsWrap.querySelectorAll(".cuisine-chip").forEach((c) => {
            c.classList.toggle("active", c.dataset.cuisine === select.value);
        });
    });

}



let sentimentChart;
let topRestaurantsChart;

function themeColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function initCharts() {

    const sentimentCtx = document.getElementById("sentimentChart");
    const topCtx = document.getElementById("topRestaurantsChart");

    if (!sentimentCtx || !topCtx || typeof Chart === "undefined") return;

    const muted = themeColor("--text-muted") || "#767676";
    const gridColor = "rgba(26,26,26,.06)";
    const accent = themeColor("--accent") || "#E23744";
    const dark = themeColor("--dark") || "#1A1A1A";

    sentimentChart = new Chart(sentimentCtx, {
        type: "doughnut",
        data: {
            labels: ["Positive", "Negative"],
            datasets: [{
                data: [0, 0],
                backgroundColor: [accent, dark],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: { position: "bottom", labels: { color: muted, font: { family: "Inter" } } }
            }
        }
    });

    topRestaurantsChart = new Chart(topCtx, {
        type: "bar",
        data: {
            labels: [],
            datasets: [{
                label: "Average Rating",
                data: [],
                backgroundColor: accent,
                borderRadius: 8,
                maxBarThickness: 38
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: muted }, grid: { display: false } },
                y: { ticks: { color: muted }, grid: { color: gridColor }, beginAtZero: true, suggestedMax: 5 }
            }
        }
    });

}



async function loadDashboard() {

    try {

        const response = await fetch(`${API}/dashboard`);
        const data = await response.json();

        document.getElementById("restaurants").innerHTML = data.Restaurants;
        document.getElementById("reviews").innerHTML = data.Reviews;
        document.getElementById("rating").innerHTML = data["Average Rating"];
        document.getElementById("positive").innerHTML = data["Positive Reviews"];

        if (sentimentChart) {
            const totalReviews = Number(data.Reviews) || 0;
            const positiveReviews = Number(data["Positive Reviews"]) || 0;
            const negativeReviews = Math.max(totalReviews - positiveReviews, 0);

            sentimentChart.data.datasets[0].data = [positiveReviews, negativeReviews];
            sentimentChart.update();
        }

    } catch (error) {
        console.log(error);
    }

}



async function loadTopRestaurants() {

    try {

        const response = await fetch(`${API}/top_restaurants`);
        const data = await response.json();

        let html = "";

        data.forEach((item) => {
            html += `
                <tr>
                    <td>${item.Restaurant_review}</td>
                    <td>${ratingBadgeHTML(item.Average_Rating)}</td>
                    <td>${item.Review_Count}</td>
                </tr>
            `;
        });

        document.getElementById("topRestaurantTable").innerHTML = html;

        if (topRestaurantsChart) {
            const top5 = data.slice(0, 5);
            topRestaurantsChart.data.labels = top5.map((item) => item.Restaurant_review);
            topRestaurantsChart.data.datasets[0].data = top5.map((item) => Number(item.Average_Rating.toFixed(2)));
            topRestaurantsChart.update();
        }

    } catch (error) {
        console.log(error);
    }

}



function setupNavbar() {

    const nav = document.getElementById("mainNav");
    if (!nav) return;

    window.addEventListener("scroll", () => {
        nav.classList.toggle("scrolled", window.scrollY > 40);
    });

    const collapseEl = document.getElementById("navbarNav");
    document.querySelectorAll(".navbar-nav .nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            if (collapseEl && collapseEl.classList.contains("show") && window.bootstrap) {
                window.bootstrap.Collapse.getOrCreateInstance(collapseEl).hide();
            }
        });
    });

}



function setupScrollReveal() {

    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
        items.forEach((item) => item.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    items.forEach((item) => observer.observe(item));

}



window.onload = function () {

    setupNavbar();
    setupScrollReveal();
    setupHeroSearch();
    setupCuisineChips();
    initCharts();

    loadDashboard();
    loadTopRestaurants();

    runScanDemo();

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

};