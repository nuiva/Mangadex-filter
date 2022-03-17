import { Dashboard } from "./dashboard";
import { NavMenu } from "./navMenu";

export default async function main(): Promise<CallableFunction> {
    await new Promise(f => setTimeout(f, 2000));
    let nav = new NavMenu();
    document.body.appendChild(nav);
    let dashboard = Dashboard.show();
    return () => {
        dashboard.hide();
        nav.remove();
    }
}
