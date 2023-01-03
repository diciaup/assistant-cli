import {app} from "electron";
import routes from "./routes";


app.on('ready', routes[process.env.ROUTE].request);

app.on('window-all-closed', () => {
    app.quit()
})
