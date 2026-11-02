import "./styles.css";
import { show } from "./ui/router";
import { renderStart } from "./ui/start";

void navigator.storage?.persist?.();
show(renderStart);
