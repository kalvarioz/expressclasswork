document.addEventListener("DOMContentLoaded", () => {

  const input = document.querySelector(".search-input");
  const cards = document.querySelectorAll(".movie-card");
  
  input?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    cards.forEach(card => {
      const title = card.querySelector(".card-title")?.textContent.toLowerCase();
      card.style.display = title?.includes(query) ? "" : "none";
    });
  });
});