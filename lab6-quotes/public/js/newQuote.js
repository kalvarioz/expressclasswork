document.querySelector("#quoteForm").addEventListener("submit", function (e) {
    let quoteText = document.querySelector("#quoteText").value.trim();
    let errorDiv = document.querySelector("#quoteError");
    if (quoteText.length < 5) {
        e.preventDefault();
        errorDiv.style.display = "block";
    } else {
        errorDiv.style.display = "none";
    }
});
document.querySelector("#quoteText").addEventListener("input", function () {
    if (this.value.trim().length >= 5) {
        document.querySelector("#quoteError").style.display = "none";
    }
});