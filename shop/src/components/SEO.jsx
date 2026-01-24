import { useEffect } from 'react';

/**
 * SEO Component - Updates document head with page-specific meta tags
 * Compatible with React 19 (no external dependencies)
 */
const SEO = ({
    title,
    description,
    image,
    url,
    type = 'website',
    noIndex = false
}) => {
    const siteName = 'El Cuartito Records';
    const defaultTitle = 'El Cuartito Records | Curated Vinyl Shop in Copenhagen';
    const defaultDescription = 'Discover hand-picked vinyl records from Copenhagen. Techno, ambient, electronic & more. Ship worldwide.';
    const defaultImage = 'https://elcuartito.dk/og-image.jpg';
    const baseUrl = 'https://elcuartito.dk';

    const seo = {
        title: title ? `${title} | ${siteName}` : defaultTitle,
        description: description || defaultDescription,
        image: image || defaultImage,
        url: url ? `${baseUrl}${url}` : baseUrl,
    };

    useEffect(() => {
        // Update title
        document.title = seo.title;

        // Helper to update or create meta tag
        const updateMeta = (attribute, key, value) => {
            let element = document.querySelector(`meta[${attribute}="${key}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, key);
                document.head.appendChild(element);
            }
            element.setAttribute('content', value);
        };

        // Primary meta tags
        updateMeta('name', 'description', seo.description);
        if (noIndex) {
            updateMeta('name', 'robots', 'noindex, nofollow');
        }

        // Open Graph
        updateMeta('property', 'og:title', seo.title);
        updateMeta('property', 'og:description', seo.description);
        updateMeta('property', 'og:image', seo.image);
        updateMeta('property', 'og:url', seo.url);
        updateMeta('property', 'og:type', type);

        // Twitter
        updateMeta('property', 'twitter:title', seo.title);
        updateMeta('property', 'twitter:description', seo.description);
        updateMeta('property', 'twitter:image', seo.image);
        updateMeta('property', 'twitter:url', seo.url);

        // Update canonical
        let canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            canonical.setAttribute('href', seo.url);
        }

    }, [seo.title, seo.description, seo.image, seo.url, type, noIndex]);

    return null; // This component doesn't render anything
};

export default SEO;
