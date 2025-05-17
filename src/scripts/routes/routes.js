import HomePage from "../pages/home/home-page";
import AddPage from "../pages/add/add-page";
import AboutPage from "../pages/about/about-page";
import LoginPage from "../pages/auth/login/login-page";
import RegisterPage from "../pages/auth/register/register-page";
import BookmarkStoryPage from "../pages/bookmark/bookmark-story-page";

const routes = {
  "/login": new LoginPage(),
  "/register": new RegisterPage(),

  "/": () => {
    console.log('Initializing HomePage for root route');
    const homePage = new HomePage();
    return homePage;
  },
  "/home": () => {
    console.log('Initializing HomePage for /home route');
    const homePage = new HomePage();
    return homePage;
  },
  "/add": new AddPage(),
  "/about": new AboutPage(),
  "/bookmark": new BookmarkStoryPage(),
};

export default routes;