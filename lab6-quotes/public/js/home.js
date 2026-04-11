document.querySelector("#keywordForm").addEventListener("submit", function (e) {
    let keyword = document.querySelector("#keywordInput").value.trim();
    let errorDiv = document.querySelector("#keywordError");
    if (keyword.length < 3) {
        e.preventDefault();
        errorDiv.style.display = "block";
    } else {
        errorDiv.style.display = "none";
    }
});
document.querySelector("#keywordInput").addEventListener("input", function () {
    if (this.value.trim().length >= 3) {
        document.querySelector("#keywordError").style.display = "none";
    }
});