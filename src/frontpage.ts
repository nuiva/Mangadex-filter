import { Dashboard } from "./dashboard";
import { NavMenu } from "./navMenu";

export default async function main() {
    await new Promise(f => setTimeout(f, 2000));
    NavMenu.initialize();
    let nav = new NavMenu();
    document.body.appendChild(nav);
    Dashboard.show();
}
