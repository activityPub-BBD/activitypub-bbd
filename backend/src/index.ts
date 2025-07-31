import app from "./app.ts";
import "@utils/logging.ts";

app.listen(8000, () => {
  console.log("Server started at http://localhost:8000");
});
