import { filebaseInit } from "../src/index";
const db = filebaseInit("test");
db.insert("user", { name: "Bangeel" }, "02");
console.log(db.find_all("user"));