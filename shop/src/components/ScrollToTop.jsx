import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component - scrolls to top of page on route change
 * Skips scroll-to-top when navigating back to home (catalog) to preserve position
 * Place this inside BrowserRouter in your app
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();
    const prevPathname = useRef(pathname);

    useEffect(() => {
        const cameFromProduct = prevPathname.current.startsWith('/product/');
        const goingHome = pathname === '/';

        // Don't scroll to top when returning from a product page to the catalog
        if (!(cameFromProduct && goingHome)) {
            window.scrollTo(0, 0);
        }

        prevPathname.current = pathname;
    }, [pathname]);

    return null;
};

export default ScrollToTop;
