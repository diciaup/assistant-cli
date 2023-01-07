import {app} from "electron";
import routes from "./routes";


app.on('ready', () => routes[process.env.ROUTE].request(process.argv.slice(2)));

app.on('window-all-closed', () => {
    app.quit()
})
