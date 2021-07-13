import { Dashboard } from "./dashboard";
import { NavMenu } from "./navMenu";

export default async function main() {
    NavMenu.initialize();
    let nav = new NavMenu();
    document.body.appendChild(nav);
    Dashboard.show();
}
