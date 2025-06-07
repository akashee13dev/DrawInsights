import {createBrowserRouter ,  RouterProvider} from "react-router-dom";
import '@mantine/core/styles.css';
import {MantineProvider} from "@mantine/core";
import Home from "./screens/home";
import "./index.css";


const paths = [
  {
    path : "/",
    element : (
      <Home></Home>
    )
  }
];

const BrowserRounter  = createBrowserRouter(paths);

const App = () => {
  return(
    <MantineProvider>
      <RouterProvider router={BrowserRounter}/>
    </MantineProvider>
  )
}

export default App;