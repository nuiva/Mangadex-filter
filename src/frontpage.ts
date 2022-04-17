import { dashboard } from "./dashboard";
import { NavMenu } from "./navMenu";

export default async function main(): Promise<CallableFunction> {
    let nav = new NavMenu();
    document.body.appendChild(nav);
    dashboard.show();
    return () => {
        dashboard.hide();
        nav.remove();
    }
}
