import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import errorHandler from "./plugins/errorHandler";

const app = createApp(App);

// Install error handling plugin
app.use(errorHandler);

app.mount("#app");
