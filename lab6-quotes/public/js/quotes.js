let authorLinks = document.querySelectorAll(".authorNames");
for (let i of authorLinks) {
    i.addEventListener("click", displayAuthorInfo);
}

async function displayAuthorInfo() {
    let authorId = this.getAttribute("authorId");
    let response = await fetch("/api/author/" + authorId);
    let data = await response.json();
    let a = data[0];
    document.querySelector("#authorName").textContent = a.firstName + " " + a.lastName;
    document.querySelector("#authorPicture").src = a.portrait || "";
    let dob = a.dob ? new Date(a.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "Unknown";
    let dod = a.dod ? new Date(a.dod).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "Present";
    document.querySelector("#authorDates").textContent = dob + " - " + dod;
    document.querySelector("#authorSex").textContent = a.sex === 'M' ? "Male" : "Female";
    document.querySelector("#authorBio").textContent = a.biography || "";
    document.querySelector("#authorModal").showModal();
}
document.querySelector("#closeModal").addEventListener("click", () => {
    document.querySelector("#authorModal").close();
});
document.querySelector("#authorModal").addEventListener("click", function (e) {
    if (e.target === this) this.close();
});