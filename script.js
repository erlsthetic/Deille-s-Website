/* =========================================================
   GLOBAL DATA
   ========================================================= */

let siteData = null;
const DEFAULT_PRODUCT_IMAGE = "assets/images/default.webp";
const loaderStartedAt = performance.now();

function preloadAsset(source) {
    return new Promise(resolve => {
        const asset = new Image();
        asset.onload = resolve;
        asset.onerror = resolve;
        asset.src = source;
    });
}

async function finishSiteLoading() {
    const essentialAssets = [
        "assets/logos/dielle_white.svg",
        "assets/images/hero.webp",
        "assets/images/shelves.webp",
        "assets/images/default.webp"
    ];

    const assetsReady = Promise.all(essentialAssets.map(preloadAsset));
    const fontsReady = document.fonts?.ready || Promise.resolve();
    const elapsedLoadingTime = performance.now() - loaderStartedAt;
    const minimumWait = new Promise(resolve => window.setTimeout(
        resolve,
        Math.max(0, 2000 - elapsedLoadingTime)
    ));
    const maximumWait = new Promise(resolve => window.setTimeout(
        resolve,
        Math.max(0, 10000 - elapsedLoadingTime)
    ));

    await Promise.all([
        minimumWait,
        Promise.race([
            Promise.all([assetsReady, fontsReady]),
            maximumWait
        ])
    ]);

    const loader = document.getElementById("site-loader");
    document.body.classList.remove("is-loading");
    initializeScrollReveals();

    requestAnimationFrame(() => loader?.classList.add("is-exiting"));
    window.setTimeout(() => loader?.remove(), 450);
}

function openAnimatedDialog(dialog) {
    dialog.classList.remove("is-closing", "is-open");
    dialog.showModal();
    requestAnimationFrame(() => dialog.classList.add("is-open"));
}

function closeAnimatedDialog(dialog) {
    if (!dialog?.open || dialog.classList.contains("is-closing")) {
        return;
    }

    if (dialog.classList.contains("product-detail-dialog")) {
        dialog.close();
        dialog.classList.remove("is-closing", "is-open");
        return;
    }

    dialog.classList.add("is-closing");
    window.setTimeout(() => {
        dialog.close();
        dialog.classList.remove("is-closing", "is-open");
    }, 450);
}


/* =========================================================
   DEVICE DETECTION
   ========================================================= */

function updateDeviceClass() {

    const body = document.body;
    const width = window.innerWidth;

    let deviceClass;

    if (width >= 1024) {
        deviceClass = "desktop";
    }
    else if (width >= 768) {
        deviceClass = "tablet";
    }
    else {
        deviceClass = "mobile";
    }

    if (!body.classList.contains(deviceClass)) {

        body.classList.remove(
            "desktop",
            "tablet",
            "mobile"
        );

        body.classList.add(deviceClass);
    }
}


/* =========================================================
   DATA
   ========================================================= */

async function loadSiteData() {

    try {

        const response = await fetch("data.json");

        if (!response.ok) {
            throw new Error(
                `Unable to load data.json: ${response.status}`
            );
        }

        siteData = await response.json();

        initializeWebsite();
        await finishSiteLoading();

    }
    catch (error) {

        console.error(
            "Failed to load website data:",
            error
        );

        document.body.classList.remove("is-loading");
        document.getElementById("site-loader")?.remove();

    }
}


/* =========================================================
   PROMO
   ========================================================= */

function parsePromoDate(dateString) {

    const [month, day, year] = dateString
        .split("/")
        .map(Number);

    return new Date(
        year,
        month - 1,
        day
    );
}


function isPromoValid(promo) {

    if (!promo) {
        return false;
    }

    if (!promo["promo-start"] || !promo["promo-end"]) {
        return false;
    }

    const now = new Date();

    const startDate = parsePromoDate(
        promo["promo-start"]
    );

    const endDate = parsePromoDate(
        promo["promo-end"]
    );

    // End date is inclusive
    endDate.setHours(
        23,
        59,
        59,
        999
    );

    return (
        now >= startDate &&
        now <= endDate
    );
}

function renderPromoBanner() {

    const container = document.getElementById("promo-banner");

    const promo = siteData?.information?.current_promo;

    console.log("With promo: " + promo["promo-text"] + "\nContainer: " + container);

    if (!isPromoValid(promo)) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = `
        <div
            class="promo-banner tooltip-trigger"
            tabindex="0"
        >
            <img
                class="promo-banner__icon"
                src="assets/logos/bee.svg"
                alt=""
                aria-hidden="true"
            >

            <span class="promo-banner__text">
                ${promo["promo-text"]}
            </span>

            <button class="promo-banner__dismiss" type="button" aria-label="Dismiss promotion">×</button>

            <span class="tooltip promo-banner__tooltip" aria-hidden="true">
                ${promo["promo-hover-text"] || ""}
            </span>
        </div>
    `;

    container.querySelector(".promo-banner__dismiss")?.addEventListener("click", () => {
        container.innerHTML = "";
        updateScrollOffset();
        window.dispatchEvent(new Event("scroll"));
    });
}

function updateScrollOffset() {
    const header = document.getElementById("site-top");

    if (header) {
        document.documentElement.style.setProperty(
            "--sticky-header-height",
            `${header.offsetHeight}px`
        );
    }
}

/* =========================================================
   ABOUT
   ========================================================= */

function updatePartnerLayout() {
    const list = document.getElementById("partner-links");

    if (!list || list.childElementCount === 0) {
        return;
    }

    const partnerCount = list.childElementCount;
    const itemWidth = window.innerWidth <= 767 ? 112 : 137;
    const availableColumns = Math.max(
        1,
        Math.floor((list.clientWidth + 16) / itemWidth)
    );
    let columns = Math.min(partnerCount, availableColumns);

    if (partnerCount > availableColumns && partnerCount <= availableColumns * 2) {
        columns = Math.ceil(partnerCount / 2);
    }

    list.style.setProperty("--partner-columns", columns);
}

function renderPartners() {
    const list = document.getElementById("partner-links");
    const partners = siteData?.information?.partners || [];

    if (!list) {
        return;
    }

    list.innerHTML = partners
        .slice()
        .sort((a, b) => Number(a.partner_sort_order) - Number(b.partner_sort_order))
        .map(partner => {
            const name = partner.parnter_name || partner.partner_name || "Partner";

            return `
                <a
                    class="partner-link"
                    href="${partner.partner_link}"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="${name}"
                >
                    <img src="${partner.partner_image}" alt="" loading="lazy" decoding="async">
                    <span class="tooltip partner-link__tooltip" aria-hidden="true">
                        <strong>${name}</strong>
                        <span>${partner.partner_hover_text || "Visit partner"}</span>
                    </span>
                </a>
            `;
        })
        .join("");

    requestAnimationFrame(updatePartnerLayout);
}

function initializeAbout() {
    const learnMore = document.getElementById("about-learn-more");
    const dialog = document.getElementById("about-story-dialog");
    const closeDialog = document.getElementById("about-story-dialog-close");

    renderPartners();

    learnMore?.addEventListener("click", () => openAnimatedDialog(dialog));
    closeDialog?.addEventListener("click", () => closeAnimatedDialog(dialog));

    dialog?.addEventListener("click", event => {
        if (event.target === dialog) {
            closeAnimatedDialog(dialog);
        }
    });

    dialog?.addEventListener("cancel", event => {
        event.preventDefault();
        closeAnimatedDialog(dialog);
    });
}

/* =========================================================
   ORDER / CONTACT
   ========================================================= */

let snackbarTimer = null;

function showSnackbar(message) {
    const snackbar = document.getElementById("snackbar");

    if (!snackbar) {
        return;
    }

    snackbar.textContent = message;
    snackbar.classList.add("is-visible");
    clearTimeout(snackbarTimer);
    snackbarTimer = window.setTimeout(() => {
        snackbar.classList.remove("is-visible");
    }, 3000);
}

async function copyContactValue(value, message) {
    try {
        await navigator.clipboard.writeText(value);
    }
    catch {
        const input = document.createElement("textarea");
        input.value = value;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
    }

    showSnackbar(message);
}

function initializeOrderSection() {
    const contact = siteData?.information?.contact;
    const container = document.getElementById("order-contact");
    const location = document.getElementById("order-location");
    const mapFrame = document.querySelector(".order-section__map-frame");
    const map = mapFrame?.querySelector(".order-section__map");

    if (!contact || !container || !location) {
        return;
    }

    const phoneForDialing = String(contact.phone || "")
        .replace(/[^\d+]/g, "")
        .replace(/^\+63/, "0");
    const contactLine = [contact.phone, contact.fax]
        .filter(Boolean)
        .join(" / ");

    location.innerHTML = `Visit us: <strong>${contact.location || ""}</strong>`;
    container.innerHTML = `
        <p class="order-section__eyebrow">CONTACT US</p>
        <h2>Let’s Create Your<br><span>Perfect Order</span></h2>
        <h3>Every order is a little different.</h3>
        <p>At <strong>Dielle's</strong>, we believe your order deserves a personal touch. Whether you're choosing our honey wines, putting together a gift package, or planning something special with custom bottles and handcrafted abaca and wooden packages, we want to make sure every detail is just right.</p>
        <p>That's why we process orders through <strong>direct messages</strong> or <strong>email</strong>. Simply send us a message, and our team will help you confirm your selections, quantities, customizations, availability, and delivery details before your order is finalized.</p>
        <p class="order-section__prompt">Have something in mind? Let's make it happen.</p>
        <div class="order-section__actions">
            <a class="order-section__action order-section__action--chat" href="${contact.messenger}" target="_blank" rel="noopener noreferrer"><img src="assets/logos/socials/messenger.svg" alt=""> <span>CHAT WITH US</span></a>
            <a class="order-section__action order-section__action--email" href="mailto:${contact.email}"><img src="assets/logos/email.svg" alt=""> <span>EMAIL</span></a>
            <a class="order-section__action order-section__action--call" href="tel:${phoneForDialing}"><img src="assets/logos/call.svg" alt=""> <span>CALL/MESSAGE<br>${contact.phone || ""}</span></a>
        </div>
        <p class="order-section__details">Email: <strong>${contact.email || ""}</strong><br>Contact: <strong>${contactLine}</strong></p>
    `;

    const addLaunchFallback = (selector, value, message) => {
        container.querySelector(selector)?.addEventListener("click", () => {
            window.setTimeout(() => {
                if (document.hasFocus()) {
                    copyContactValue(value, message);
                }
            }, 900);
        });
    };

    addLaunchFallback(".order-section__action--email", contact.email, "Email copied to the clipboard.");
    addLaunchFallback(".order-section__action--call", phoneForDialing, "Phone number copied to the clipboard.");

    if (!mapFrame || !map) {
        return;
    }

    let fallbackTimer;
    let mapRequestStarted = false;

    const showMapFallback = () => {
        mapFrame.classList.add("is-fallback");
        mapFrame.classList.remove("is-loaded");
    };

    const beginMapLoadTimer = () => {
        if (mapRequestStarted) {
            return;
        }

        mapRequestStarted = true;
        fallbackTimer = window.setTimeout(showMapFallback, 8000);
    };

    map.addEventListener("load", () => {
        if (mapFrame.classList.contains("is-fallback")) {
            return;
        }

        window.clearTimeout(fallbackTimer);
        mapFrame.classList.add("is-loaded");
    });
    map.addEventListener("error", showMapFallback);

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) {
                return;
            }

            beginMapLoadTimer();
            observer.disconnect();
        }, { rootMargin: "300px" });

        observer.observe(mapFrame);
    } else {
        beginMapLoadTimer();
    }
}


/* =========================================================
   HEADER
   ========================================================= */


/*
   These IDs should correspond to the sections
   of the single-page website.
*/

const navigationItems = [
    {
        label: "Home",
        target: "home"
    },
    {
        label: "About",
        target: "about"
    },
    {
        label: "CELLAR",
        target: "products"
    }
];


/* ---------------------------------------------------------
   RENDER NAVIGATION
   --------------------------------------------------------- */

function renderNavigation() {

    const desktopNavigation =
        document.getElementById("desktop-navigation");

    const mobileNavigation =
        document.getElementById("mobile-navigation");


    const navigationHTML =
        navigationItems
            .map(item => `
                <a
                    href="#${item.target}"
                    data-section="${item.target}"
                >
                    ${item.label}
                </a>
            `)
            .join("");


    desktopNavigation.innerHTML = navigationHTML;
    mobileNavigation.innerHTML = navigationHTML;

}


/* ---------------------------------------------------------
   RENDER SOCIAL LINKS
   --------------------------------------------------------- */

function createSocialHTML(social) {

    return `
        <a
            href="${social.social_link}"
            class="social-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="${social.social_name}"
        >

            <img
                src="${social.social_icon}"
                alt=""
                aria-hidden="true"
            >

            <span class="tooltip social-link__tooltip">
                ${social.social_hover_text || social.social_name}
            </span>

        </a>
    `;

}


function renderSocialLinks() {

    const desktopContainer =
        document.getElementById("social-links");

    const mobileContainer =
        document.getElementById("mobile-social-links");


    const socials =
        siteData?.information?.socials || [];


    const sortedSocials =
        [...socials].sort(
            (a, b) =>
                Number(a.social_sort_order) -
                Number(b.social_sort_order)
        );


    const socialHTML =
        sortedSocials
            .map(createSocialHTML)
            .join("");


    desktopContainer.innerHTML = socialHTML;
    mobileContainer.innerHTML = socialHTML;

}

function renderFooterSocialLinks() {
    const container = document.getElementById("footer-social-links");
    const socials = siteData?.information?.socials || [];

    if (!container) {
        return;
    }

    container.innerHTML = [...socials]
        .sort((a, b) => Number(a.social_sort_order) - Number(b.social_sort_order))
        .map(createSocialHTML)
        .join("");
}

/* =========================================================
   SOCIAL ICON THEME
   ========================================================= */
function initializeSocialThemeObserver() {

    const socialLinks =
        document.getElementById("social-links");

    if (!socialLinks) {
        return;
    }

    const sections =
        document.querySelectorAll(
            "[data-section-theme]"
        );

    if (!sections.length) {
        return;
    }

    function updateSocialTheme() {

        const socialRect =
            socialLinks.getBoundingClientRect();

        // Use the vertical center of the social icons
        const socialY =
            socialRect.top + (socialRect.height / 2);

        let activeSection = null;

        sections.forEach(section => {

            const rect =
                section.getBoundingClientRect();

            if (
                socialY >= rect.top &&
                socialY <= rect.bottom
            ) {
                activeSection = section;
            }

        });

        if (!activeSection) {
            return;
        }

        const theme =
            activeSection.dataset.sectionTheme;

        if (theme === "light") {

            socialLinks.classList.remove("is-dark");
            socialLinks.classList.add("is-light");

        } else {

            socialLinks.classList.remove("is-light");
            socialLinks.classList.add("is-dark");

        }
    }

    updateSocialTheme();

    window.addEventListener(
        "scroll",
        updateSocialTheme,
        { passive: true }
    );

    window.addEventListener(
        "resize",
        updateSocialTheme
    );
}


/* =========================================================
   FOOTER VISIBILITY
   ========================================================= */
function initializeFooterSocialObserver() {

    const footer = document.querySelector(".site-footer");
    const headerSocials = document.getElementById("social-links");

    if (!footer || !headerSocials || !("IntersectionObserver" in window)) {
        return;
    }

    const observer = new IntersectionObserver(entries => {
        headerSocials.classList.toggle(
            "is-footer-visible",
            entries.some(entry => entry.isIntersecting)
        );
    }, { threshold: 0.05 });

    observer.observe(footer);
}

/* ---------------------------------------------------------
   ACTIVE SECTION
   --------------------------------------------------------- */

function initializeSectionObserver() {

    const sections =
        [
            ...navigationItems.map(item =>
                document.getElementById(item.target)
            ),
            document.getElementById("order")
        ].filter(Boolean);


    const navigationLinks =
        document.querySelectorAll(
            "[data-section]"
        );

    const updateActiveSection = () => {
        const headerHeight =
            document.getElementById("site-top")?.offsetHeight || 0;
        const sectionReferenceLine = Math.max(
            headerHeight + 1,
            window.innerHeight * 0.4
        );
        let activeSection = sections[0];

        sections.forEach(section => {
            if (section.getBoundingClientRect().top <= sectionReferenceLine) {
                activeSection = section;
            }
        });

        navigationLinks.forEach(link => {
            link.classList.toggle(
                "active",
                link.dataset.section === activeSection?.id
            );
        });

        document.querySelectorAll(".site-header__order").forEach(button => {
            button.classList.toggle("is-active", activeSection?.id === "order");
        });
    };

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();

    return;


    const observer =
        new IntersectionObserver(
            entries => {

                /*
                   Only process sections currently
                   intersecting the viewport.
                */

                entries.forEach(entry => {

                    if (!entry.isIntersecting) {
                        return;
                    }


                    const sectionId =
                        entry.target.id;


                    navigationLinks.forEach(link => {

                        link.classList.toggle(
                            "active",
                            link.dataset.section === sectionId
                        );

                    });

                });

            },
            {
                /*
                   The header occupies some space,
                   so trigger the active state slightly
                   before the section reaches the top.
                */

                rootMargin: "-25% 0px -60% 0px",

                threshold: 0
            }
        );


    sections.forEach(section => {
        observer.observe(section);
    });

}


/* ---------------------------------------------------------
   MOBILE DRAWER
   --------------------------------------------------------- */

function initializeMobileMenu() {

    const toggle =
        document.getElementById(
            "mobile-menu-toggle"
        );

    const drawer =
        document.getElementById(
            "mobile-drawer"
        );

    const overlay =
        document.getElementById(
            "mobile-overlay"
        );

    const closeButton =
        document.getElementById(
            "mobile-drawer-close"
        );


    function openMenu() {

        toggle.classList.add("is-open");

        drawer.classList.add("is-open");

        overlay.classList.add("is-open");


        toggle.setAttribute(
            "aria-expanded",
            "true"
        );

        toggle.setAttribute(
            "aria-label",
            "Close menu"
        );

        drawer.setAttribute(
            "aria-hidden",
            "false"
        );

        overlay.setAttribute(
            "aria-hidden",
            "false"
        );


        /*
           Prevent the page behind the drawer
           from scrolling.
        */

        document.body.style.overflow = "hidden";

    }


    function closeMenu() {

        toggle.classList.remove("is-open");

        drawer.classList.remove("is-open");

        overlay.classList.remove("is-open");


        toggle.setAttribute(
            "aria-expanded",
            "false"
        );

        toggle.setAttribute(
            "aria-label",
            "Open menu"
        );

        drawer.setAttribute(
            "aria-hidden",
            "true"
        );

        overlay.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.style.overflow = "";

    }


    toggle.addEventListener(
        "click",
        () => {

            if (
                drawer.classList.contains(
                    "is-open"
                )
            ) {
                closeMenu();
            }
            else {
                openMenu();
            }

        }
    );


    closeButton.addEventListener(
        "click",
        closeMenu
    );


    overlay.addEventListener(
        "click",
        closeMenu
    );


    /*
       Close drawer after clicking
       a navigation item.
    */

    drawer.addEventListener(
        "click",
        event => {

            const link =
                event.target.closest(
                    "a[data-section]"
                );


            if (!link) {
                return;
            }


            closeMenu();

        }
    );


    /*
       ESC key closes the drawer.
    */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                drawer.classList.contains(
                    "is-open"
                )
            ) {
                closeMenu();
            }

        }
    );

}


/* ---------------------------------------------------------
   INITIALIZE HEADER
   --------------------------------------------------------- */

function initializeHeader() {

    renderNavigation();

    renderSocialLinks();

    renderFooterSocialLinks();

    initializeSectionObserver();

    initializeSocialThemeObserver();

    initializeFooterSocialObserver();

    initializeMobileMenu();

}


/* =========================================================
   PRODUCTS
   ========================================================= */


/* ---------------------------------------------------------
   VARIANT SORTING
   --------------------------------------------------------- */

function sortProductVariants(variants) {

    return [...variants].sort((a, b) => {

        const aTags =
            (a.product_tags || [])
                .map(tag =>
                    String(tag).toLowerCase()
                );

        const bTags =
            (b.product_tags || [])
                .map(tag =>
                    String(tag).toLowerCase()
                );


        function getPriority(tags) {

            if (tags.includes("new")) {
                return 0;
            }

            if (tags.includes("best seller")) {
                return 1;
            }

            return 2;
        }


        const priorityDifference =
            getPriority(aTags) -
            getPriority(bTags);


        if (priorityDifference !== 0) {
            return priorityDifference;
        }


        return (
            Number(a.product_variation_sort_order) -
            Number(b.product_variation_sort_order)
        );

    });

}

function sortProducts(products) {

    const getProductPriority = product => {
        const tags = (product.variants || [])
            .flatMap(variant => variant.product_tags || [])
            .map(tag => String(tag).toLowerCase());

        if (tags.some(tag => tag.includes("new"))) {
            return 0;
        }

        if (tags.some(tag => tag.includes("best seller"))) {
            return 1;
        }

        return 2;
    };

    return [...products].sort((a, b) => {
        const priorityDifference = getProductPriority(a) - getProductPriority(b);

        if (priorityDifference !== 0) {
            return priorityDifference;
        }

        return Number(a.product_id) - Number(b.product_id);
    });
}

/* ---------------------------------------------------------
   PRODUCT LOOKUP
   --------------------------------------------------------- */

function getProductById(productId) {

    return (
        siteData?.products || []
    ).find(product =>
        String(product.product_id) ===
        String(productId)
    );

}

function resolveProductReference(reference) {

    const parts =
        String(reference).split("_");

    const productId = parts[0];
    const variantId = parts[1] || null;


    const product =
        getProductById(productId);


    if (!product) {
        console.warn(
            `Product ${productId} was not found.`
        );

        return null;
    }


    const sortedVariants =
        sortProductVariants(
            product.variants || []
        );


    /*
     * Entire product
     */

    if (!variantId) {

        return {
            product,
            variants: sortedVariants,
            specificVariant: false
        };

    }


    /*
     * Specific variant
     */

    const variant =
        sortedVariants.find(item =>
            String(item.product_variation_id) ===
            String(variantId)
        );


    if (!variant) {

        console.warn(
            `Variant ${variantId} was not found for product ${productId}.`
        );

        return null;
    }


    return {
        product,
        variants: [variant],
        specificVariant: true
    };

}

/* ---------------------------------------------------------
   PRICE
   --------------------------------------------------------- */

function formatProductPrice(price) {

    if (
        price === null ||
        price === undefined ||
        price === ""
    ) {
        return "TBD";
    }


    const numericPrice =
        Number(price);


    if (Number.isNaN(numericPrice)) {
        return "TBD";
    }


    return `PHP ${numericPrice.toFixed(2)}`;

}

/* ---------------------------------------------------------
   VARIANT NAME
   --------------------------------------------------------- */

function getVariantShortName(variant) {

    return String(
        variant.product_variation_name_short || ""
    ).slice(0, 3);

}

function getProductImageSource(variant) {

    return variant?.product_variation_cover_img || DEFAULT_PRODUCT_IMAGE;

}

/* ---------------------------------------------------------
   BADGE
   --------------------------------------------------------- */

function getVariantBadge(variant) {

    if (!variant) {
        return null;
    }


    const tags =
        (variant.product_tags || [])
            .map(tag =>
                String(tag).toLowerCase()
            );


    if (tags.includes("new")) {

        return {
            label: "NEWLY ADDED",
            type: "new"
        };

    }


    if (tags.includes("best seller")) {

        return {
            label: "BEST SELLER",
            type: "best-seller"
        };

    }


    return null;

}

/* ---------------------------------------------------------
   VARIANT IMAGES
   --------------------------------------------------------- */

function loadImage(src) {
    return new Promise(resolve => {
        const image = new Image();

        image.onload = () => resolve(src);
        image.onerror = () => resolve(null);

        image.src = src;
    });
}


async function getVariantImages(variant) {

    const coverImage =
        await loadImage(getProductImageSource(variant));

    const images = [
        coverImage || DEFAULT_PRODUCT_IMAGE
    ];


    const folder =
        variant.product_variation_images_folder;


    if (!folder) {
        return images;
    }


    let index = 1;


    while (true) {

        const src =
            `${folder}/${index}.png`;


        const loaded =
            await loadImage(src);


        if (!loaded) {
            break;
        }


        images.push(loaded);

        index++;

    }


    return images;

}


/* ---------------------------------------------------------
   PRODUCT CARD
   --------------------------------------------------------- */

async function openProductDetail(product, initialVariant) {
    const pageScrollX = window.scrollX;
    const pageScrollY = window.scrollY;
    const dialog = document.getElementById("product-detail-dialog");
    const variants = sortProductVariants(product.variants || []);

    if (!dialog || variants.length === 0) {
        return;
    }

    const baseVariant = initialVariant || variants[0];
    let selectedVariant = null;
    let hoveredVariant = null;
    let galleryVariant = variants[0];
    let images = variants.map(getProductImageSource);
    let imageIndex = 0;
    let imageRequestId = 0;
    let imageDisplayRequestId = 0;
    let hoverTimer = null;
    let thumbnailSignature = "";

    dialog.innerHTML = `
        <div class="product-detail" aria-labelledby="product-detail-name">
            <button class="product-detail__close" type="button" aria-label="Close product details">×</button>
            <div class="product-detail__gallery">
                <div class="product-detail__image-frame">
                    <img class="product-detail__image" alt="${product.product_name}">
                    <span class="product-detail__badge"></span>
                    <button class="product-detail__image-arrow product-detail__image-arrow--prev" type="button" aria-label="Previous image">‹</button>
                    <button class="product-detail__image-arrow product-detail__image-arrow--next" type="button" aria-label="Next image">›</button>
                </div>
                <div class="product-detail__thumbnails" aria-label="Product images"></div>
            </div>
            <div class="product-detail__content">
                <h2 id="product-detail-name" class="product-detail__name"></h2>
                <p class="product-detail__price"></p>
                <p class="product-detail__variant-label"><strong>Variant:</strong> <span></span></p>
                <div class="product-detail__variants" aria-label="Product variations"></div>
                <a href="#order" class="product-detail__order">ORDER</a>
                <div class="product-detail__description-wrap">
                    <h3>Description</h3>
                    <p class="product-detail__description"></p>
                    <button class="product-detail__see-more" type="button">See more</button>
                </div>
                <div class="product-detail__tags"></div>
            </div>
        </div>
    `;

    const detail = dialog.querySelector(".product-detail");
    const closeButton = detail.querySelector(".product-detail__close");
    const scrollBody = document.createElement("div");

    scrollBody.className = "product-detail-dialog__body";
    closeButton.remove();
    dialog.prepend(closeButton);
    dialog.append(scrollBody);
    scrollBody.append(detail);

    const image = dialog.querySelector(".product-detail__image");
    const thumbnails = dialog.querySelector(".product-detail__thumbnails");
    const badge = dialog.querySelector(".product-detail__badge");
    const description = dialog.querySelector(".product-detail__description");
    const seeMore = dialog.querySelector(".product-detail__see-more");
    const gallery = dialog.querySelector(".product-detail__gallery");
    const imageFrame = dialog.querySelector(".product-detail__image-frame");
    const previousImage = dialog.querySelector(".product-detail__image-arrow--prev");
    const nextImage = dialog.querySelector(".product-detail__image-arrow--next");
    const content = dialog.querySelector(".product-detail__content");
    const name = dialog.querySelector(".product-detail__name");
    const price = dialog.querySelector(".product-detail__price");
    const variantLabel = dialog.querySelector(".product-detail__variant-label span");
    const tagsContainer = dialog.querySelector(".product-detail__tags");

    function getActiveVariant() {
        return hoveredVariant || selectedVariant || galleryVariant || baseVariant;
    }

    function renderBadge(variant) {
        const badgeData = getVariantBadge(variant);
        badge.textContent = badgeData?.label || "";
        badge.className = `product-detail__badge${badgeData ? ` product-detail__badge--${badgeData.type} is-visible` : ""}`;
    }

    function preloadImages(sources) {
        sources.filter(Boolean).forEach(source => {
            const preloadedImage = new Image();
            preloadedImage.src = source;
        });
    }

    function setMainImage(source) {
        const imageSource = source || DEFAULT_PRODUCT_IMAGE;
        const requestId = ++imageDisplayRequestId;
        const preloadedImage = new Image();
        let hasCommitted = false;

        gallery.classList.add("is-loading");

        const commitImage = resolvedSource => {
            if (hasCommitted || requestId !== imageDisplayRequestId) {
                return;
            }

            hasCommitted = true;
            image.src = resolvedSource;
            imageFrame.classList.remove("is-zoomed");
            image.style.transformOrigin = "center";
            image.classList.remove("is-updating");
            requestAnimationFrame(() => image.classList.add("is-updating"));
            gallery.classList.remove("is-loading");
        };

        preloadedImage.onload = () => commitImage(imageSource);
        preloadedImage.onerror = () => commitImage(DEFAULT_PRODUCT_IMAGE);
        preloadedImage.src = imageSource;

        if (preloadedImage.complete) {
            commitImage(preloadedImage.naturalWidth ? imageSource : DEFAULT_PRODUCT_IMAGE);
        }
    }

    function renderImages() {
        imageIndex = Math.max(0, Math.min(imageIndex, images.length - 1));
        setMainImage(images[imageIndex]);
        const hasMultipleImages = images.length > 1;

        renderBadge(selectedVariant || variants[imageIndex] || baseVariant);

        gallery.classList.toggle("has-multiple-images", hasMultipleImages);
        thumbnails.hidden = !hasMultipleImages;
        previousImage.hidden = !hasMultipleImages;
        nextImage.hidden = !hasMultipleImages;

        const nextSignature = images.join("|");
        if (nextSignature !== thumbnailSignature) {
            thumbnailSignature = nextSignature;
            thumbnails.innerHTML = images.map((src, index) => `
                <button class="product-detail__thumbnail" type="button" aria-label="View image ${index + 1}">
                    <img src="${src || DEFAULT_PRODUCT_IMAGE}" alt="">
                </button>
            `).join("");

            thumbnails.querySelectorAll("button").forEach((button, index) => {
                button.addEventListener("click", () => {
                    imageIndex = index;

                    if (!selectedVariant) {
                        galleryVariant = variants[imageIndex] || baseVariant;
                        renderDetails();
                    }

                    renderImages();
                });
            });

            thumbnails.querySelectorAll("img").forEach(thumbnailImage => {
                thumbnailImage.addEventListener("error", () => {
                    thumbnailImage.src = DEFAULT_PRODUCT_IMAGE;
                }, { once: true });
            });
        }

        thumbnails.querySelectorAll("button").forEach((button, index) => {
            button.classList.toggle("is-active", index === imageIndex);
        });

        thumbnails.querySelector(".is-active")?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center"
        });
    }

    function renderDetails() {
        const activeVariant = getActiveVariant();

        content.classList.remove("is-updating");
        requestAnimationFrame(() => content.classList.add("is-updating"));
        name.textContent = product.product_name;
        price.textContent = formatProductPrice(activeVariant.product_variation_price);
        variantLabel.textContent = activeVariant.product_variation_name;

        renderBadge(activeVariant);

        description.textContent = activeVariant.product_variation_description || "No description available.";
        description.classList.remove("is-expanded");
        seeMore.textContent = "See more";

        const tags = activeVariant.product_tags || [];
        tagsContainer.innerHTML = tags
            .map(tag => {
                const normalizedTag = String(tag).toLowerCase();
                const tagClass = normalizedTag.includes("new")
                    ? "is-new"
                    : (normalizedTag.includes("featured") || normalizedTag.includes("best seller"))
                        ? "is-highlight"
                        : "is-default";

                return `<span class="${tagClass}">${tag}</span>`;
            })
            .join("");

        const variantsContainer = dialog.querySelector(".product-detail__variants");
        if (!variantsContainer.childElementCount) {
            variantsContainer.innerHTML = variants.map(variant => {
            const gradient = variant.product_color_gradient || [];
            const background = gradient.length >= 2
                ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
                : (gradient[0] || "transparent");
            const selected = selectedVariant &&
                String(variant.product_variation_id) === String(selectedVariant.product_variation_id);

            return `
                <button class="product-detail__variant${selected ? " is-selected" : ""}" type="button" aria-label="${variant.product_variation_name}" style="--variant-gradient: ${background}">
                    <span>${getVariantShortName(variant)}</span>
                    <span class="tooltip product-detail__variant-tooltip" aria-hidden="true">${variant.product_variation_name}</span>
                </button>
            `;
            }).join("");

            const updateCommittedImages = async () => {
                imageRequestId++;

                if (!selectedVariant) {
                    galleryVariant = variants[0];
                    images = variants.map(getProductImageSource);
                    preloadImages(images);
                    imageIndex = 0;
                    renderDetails();
                    renderImages();
                    return;
                }

                galleryVariant = selectedVariant;
                renderDetails();

                const requestId = imageRequestId;
                const variantImages = await getVariantImages(selectedVariant);

                if (requestId !== imageRequestId) {
                    return;
                }

                images = variantImages;
                preloadImages(images);
                imageIndex = 0;
                renderImages();
            };

            variantsContainer.querySelectorAll("button").forEach((button, index) => {
                const variant = variants[index];

                const schedulePreview = () => {
                    window.clearTimeout(hoverTimer);
                    hoverTimer = window.setTimeout(() => {
                        hoveredVariant = variant;
                        renderHoverPreview(variant);
                    }, 130);
                };

                const clearPreview = () => {
                    window.clearTimeout(hoverTimer);

                    if (hoveredVariant === variant) {
                        restoreCommittedPreview();
                    }
                };

                button.addEventListener("mouseenter", schedulePreview);
                button.addEventListener("mouseleave", clearPreview);
                button.addEventListener("focus", schedulePreview);
                button.addEventListener("blur", clearPreview);
                button.addEventListener("click", () => {
                    window.clearTimeout(hoverTimer);
                    selectedVariant = selectedVariant === variant ? null : variant;
                    hoveredVariant = null;
                    updateCommittedImages();
                });
            });
        }

        variantsContainer.querySelectorAll("button").forEach((button, index) => {
            button.classList.toggle(
                "is-selected",
                selectedVariant === variants[index]
            );
        });

        requestAnimationFrame(() => {
            seeMore.hidden = description.scrollHeight <= description.clientHeight + 1;
        });
    }

    function renderHoverPreview(variant) {
        price.textContent = formatProductPrice(variant.product_variation_price);
        variantLabel.textContent = variant.product_variation_name;
        renderBadge(variant);
        setMainImage(getProductImageSource(variant));
    }

    function restoreCommittedPreview() {
        hoveredVariant = null;
        const activeVariant = selectedVariant || galleryVariant || baseVariant;
        price.textContent = formatProductPrice(activeVariant.product_variation_price);
        variantLabel.textContent = activeVariant.product_variation_name;
        renderImages();
    }

    dialog.querySelector(".product-detail__close").addEventListener("click", () => closeAnimatedDialog(dialog));
    previousImage.addEventListener("click", () => {
        imageIndex = (imageIndex - 1 + images.length) % images.length;

        if (!hoveredVariant && !selectedVariant) {
            galleryVariant = variants[imageIndex] || baseVariant;
            renderDetails();
        }

        renderImages();
    });
    nextImage.addEventListener("click", () => {
        imageIndex = (imageIndex + 1) % images.length;

        if (!hoveredVariant && !selectedVariant) {
            galleryVariant = variants[imageIndex] || baseVariant;
            renderDetails();
        }

        renderImages();
    });
    seeMore.addEventListener("click", () => {
        const expanded = description.classList.toggle("is-expanded");
        seeMore.textContent = expanded ? "See less" : "See more";
    });
    dialog.querySelector(".product-detail__order").addEventListener("click", () => {
        closeAnimatedDialog(dialog);
        document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
    });
    dialog.onclick = event => {
        const bounds = dialog.getBoundingClientRect();
        const clickedBackdrop =
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom;

        if (clickedBackdrop) {
            closeAnimatedDialog(dialog);
        }
    };
    dialog.oncancel = event => {
        event.preventDefault();
        closeAnimatedDialog(dialog);
    };

    imageFrame.addEventListener("mousemove", event => {
        if (!imageFrame.classList.contains("is-zoomed")) {
            return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 100;
        const y = ((event.clientY - bounds.top) / bounds.height) * 100;

        image.style.transformOrigin = `${x}% ${y}%`;
    });

    imageFrame.addEventListener("click", event => {
        if (event.target.closest("button")) {
            return;
        }

        imageFrame.classList.toggle("is-zoomed");

        if (!imageFrame.classList.contains("is-zoomed")) {
            image.style.transformOrigin = "center";
        }
    });

    imageFrame.addEventListener("mouseleave", () => {
        imageFrame.classList.remove("is-zoomed");
        image.style.transformOrigin = "center";
    });

    renderDetails();
    renderImages();
    openAnimatedDialog(dialog);

    const restorePageScroll = () => {
        document.documentElement.scrollLeft = pageScrollX;
        document.documentElement.scrollTop = pageScrollY;
        document.body.scrollLeft = pageScrollX;
        document.body.scrollTop = pageScrollY;
    };

    restorePageScroll();
    requestAnimationFrame(restorePageScroll);
}

function createProductCard(cardData) {

    const {
        product,
        variants,
        specificVariant
    } = cardData;


    const card =
        document.createElement("article");


    card.className =
        "product-card";


    card.tabIndex = 0;
    


    card.setAttribute(
        "aria-label",
        product.product_name
    );


    card.innerHTML = `
        <div class="product-card__media">

            <img
                class="product-card__image"
                src="${getProductImageSource(variants[0])}"
                alt="${product.product_name}"
                loading="lazy"
                decoding="async"
                fetchpriority="low"
            >

            <span class="product-card__badge"></span>

        </div>


        <div class="product-card__content">

            <h3 class="product-card__name">
                ${product.product_name}
            </h3>

            <p class="product-card__price"></p>

            <div class="product-card__variants"></div>

        </div>
    `;


    const image =
        card.querySelector(
            ".product-card__image"
        );

    image.addEventListener("error", () => {

        if (image.src.endsWith(DEFAULT_PRODUCT_IMAGE)) {
            return;
        }

        image.src = DEFAULT_PRODUCT_IMAGE;

    });


    const badge =
        card.querySelector(
            ".product-card__badge"
        );


    const price =
        card.querySelector(
            ".product-card__price"
        );


    const variantContainer =
        card.querySelector(
            ".product-card__variants"
        );


    /*
     * ------------------------------------------------------
     * STATE
     * ------------------------------------------------------
     */

    let selectedVariant = null;

    let hoveredVariant = null;

    let productCycleIndex = 0;

    let imageCycleIndex = 0;

    let cycleTimer = null;

    let cardActive = false;


    /*
     * ------------------------------------------------------
     * VARIANT HELPERS
     * ------------------------------------------------------
     */

    function getBaseVariant() {

        return variants[0];

    }


    function getActiveVariant() {

        if (hoveredVariant) {
            return hoveredVariant;
        }


        if (selectedVariant) {
            return selectedVariant;
        }


        return variants[
            productCycleIndex
        ];

    }


    function isVariantMode() {

        return Boolean(
            hoveredVariant ||
            selectedVariant
        );

    }


    /*
     * ------------------------------------------------------
     * UPDATE BADGE
     * ------------------------------------------------------
     */

    function updateBadge(variant) {

        const badgeData =
            getVariantBadge(variant);


        if (!badgeData) {

            badge.textContent = "";

            badge.className =
                "product-card__badge";

            return;

        }


        badge.textContent =
            badgeData.label;


        badge.className =
            `product-card__badge
             product-card__badge--${badgeData.type}
             is-visible`;
    }


    /*
     * ------------------------------------------------------
     * UPDATE PRICE
     * ------------------------------------------------------
     */

    function updatePrice(variant) {

        price.textContent =
            formatProductPrice(
                variant?.product_variation_price
            );

    }


    /*
     * ------------------------------------------------------
     * UPDATE VARIANT SELECTION
     * ------------------------------------------------------
     */

    function updateVariantSelection() {

        variantContainer
            .querySelectorAll(
                ".product-card__variant"
            )
            .forEach(button => {

                const isSelected =
                    selectedVariant &&
                    String(
                        selectedVariant.product_variation_id
                    ) ===
                    String(
                        button.dataset.variantId
                    );


                button.classList.toggle(
                    "is-selected",
                    isSelected
                );

            });

    }


    /*
     * ------------------------------------------------------
     * UPDATE CARD INFORMATION
     * ------------------------------------------------------
     */

    function updateCardInfo() {

        const activeVariant =
            getActiveVariant();


        if (!activeVariant) {
            return;
        }


        updatePrice(activeVariant);

        updateBadge(
            isVariantMode()
                ? activeVariant
                : getBaseVariant()
        );

        updateVariantSelection();

    }


    /*
     * ------------------------------------------------------
     * IMAGE DISPLAY
     * ------------------------------------------------------
     */

    function showImage(src) {
        image.src = src || DEFAULT_PRODUCT_IMAGE;

    }


    /*
     * ------------------------------------------------------
     * STOP IMAGE CYCLING
     * ------------------------------------------------------
     */

    function stopImageCycle() {

        if (cycleTimer) {

            clearInterval(
                cycleTimer
            );

            cycleTimer = null;

        }

    }


    /*
     * ------------------------------------------------------
     * START VARIANT IMAGE CYCLING
     * ------------------------------------------------------
     */

    async function startVariantImageCycle(
        variant
    ) {

        stopImageCycle();

        imageCycleIndex = 0;


        const images =
            await getVariantImages(
                variant
            );


        /*
         * The user may have changed variants
         * while images were loading.
         */

        if (
            getActiveVariant() !== variant
        ) {
            return;
        }


        showImage(images[0]);


        if (images.length <= 1) {
            return;
        }


        cycleTimer =
            setInterval(() => {

                imageCycleIndex =
                    (
                        imageCycleIndex + 1
                    ) % images.length;


                showImage(
                    images[imageCycleIndex]
                );

            }, 1200);

    }


    /*
     * ------------------------------------------------------
     * START PRODUCT COVER CYCLING
     * ------------------------------------------------------
     */

    async function startProductCycle() {

        stopImageCycle();


        /*
         * Only one variant
         */

        if (variants.length <= 1) {

            showImage(
                getProductImageSource(variants[0])
            );

            return;
        }


        productCycleIndex = 0;


        showImage(
            getProductImageSource(variants[0])
        );


        cycleTimer =
            setInterval(() => {

                productCycleIndex =
                    (
                        productCycleIndex + 1
                    ) % variants.length;


                const variant =
                    variants[productCycleIndex];


                showImage(
                    getProductImageSource(variant)
                );

            }, 1200);

    }


    /*
     * ------------------------------------------------------
     * START CURRENT MODE
     * ------------------------------------------------------
     */

    function startCurrentCycle() {

        cardActive = true;


        if (isVariantMode()) {

            startVariantImageCycle(
                getActiveVariant()
            );

        }
        else {

            startProductCycle();

        }

    }


    /*
     * ------------------------------------------------------
     * STOP CURRENT MODE
     * ------------------------------------------------------
     */

    function stopCurrentCycle() {

        cardActive = false;

        stopImageCycle();


        /*
         * Return image to current
         * non-cycling state.
         */

        if (isVariantMode()) {

            showImage(
                getProductImageSource(getActiveVariant())
            );

        }
        else {

            showImage(
                getProductImageSource(getBaseVariant())
            );

            productCycleIndex = 0;

        }

    }


    /*
     * ------------------------------------------------------
     * RENDER VARIANTS
     * ------------------------------------------------------
     */

    if (!specificVariant) {

        const visibleVariants =
            variants.slice(0, 4);


        const hiddenVariants =
            variants.slice(4);


        /*
         * Visible variants
         */

        visibleVariants.forEach(
            variant => {

                const button =
                    createVariantButton(
                        variant
                    );


                variantContainer
                    .appendChild(button);

            }
        );


        /*
         * +X MORE
         */

        if (hiddenVariants.length > 0) {

            const moreButton =
                document.createElement(
                    "button"
                );


            moreButton.type = "button";

            moreButton.className =
                "product-card__more";

            moreButton.setAttribute(
                "aria-label",
                "Show additional product variations"
            );


            const moreCount =
                hiddenVariants.length;


            moreButton.innerHTML = `
                <span>
                    +${moreCount}<br>
                    more
                </span>

                <span
                    class="tooltip product-card__more-tooltip"
                    aria-hidden="true"
                >
                    ${hiddenVariants
                        .map(variant => variant.product_variation_name)
                        .join(", ")}
                </span>
            `;


            moreButton.addEventListener("mouseenter", () => {
                keepProductTooltipInViewport(moreButton);
            });

            moreButton.addEventListener("focus", () => {
                keepProductTooltipInViewport(moreButton);
            });

            moreButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();


                    openProductDetail(
                        product,
                        getActiveVariant()
                    );

                }
            );


            variantContainer
                .appendChild(moreButton);

        }

    }


    /*
     * ------------------------------------------------------
     * VARIANT BUTTON CREATOR
     * ------------------------------------------------------
     */

    function createVariantButton(
        variant
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type = "button";


        button.className =
            "product-card__variant";


        button.dataset.variantId =
            variant.product_variation_id;

        button.setAttribute(
            "aria-label",
            variant.product_variation_name
        );


        const gradient =
            variant.product_color_gradient || [];


        button.style.setProperty(
            "--variant-gradient",
            gradient.length >= 2
                ? `linear-gradient(
                    135deg,
                    ${gradient[0]},
                    ${gradient[1]}
                  )`
                : (
                    gradient[0] ||
                    "transparent"
                )
        );


        button.innerHTML = `
            <span
                class="product-card__variant-short"
            >
                ${getVariantShortName(variant)}
            </span>
            <span class="tooltip product-card__variant-tooltip" aria-hidden="true">
                ${variant.product_variation_name}
            </span>
        `;


        button.addEventListener("mouseenter", () => {
            keepProductTooltipInViewport(button);
        });

        button.addEventListener("focus", () => {
            keepProductTooltipInViewport(button);
        });

        /*
         * Temporary hover state
         */

        button.addEventListener(
            "mouseenter",
            () => {

                hoveredVariant =
                    variant;


                updateCardInfo();


                if (cardActive) {

                    startVariantImageCycle(
                        variant
                    );

                }

            }
        );


        button.addEventListener(
            "mouseleave",
            () => {

                hoveredVariant = null;


                updateCardInfo();


                if (cardActive) {

                    startCurrentCycle();

                }
                else {

                    stopCurrentCycle();

                }

            }
        );


        /*
         * Keyboard focus
         */

        button.addEventListener(
            "focus",
            () => {

                hoveredVariant =
                    variant;


                updateCardInfo();


                if (cardActive) {

                    startVariantImageCycle(
                        variant
                    );

                }
            }
        );


        button.addEventListener(
            "blur",
            () => {

                hoveredVariant = null;


                updateCardInfo();


                if (cardActive) {

                    startCurrentCycle();

                }
                else {

                    stopCurrentCycle();

                }

            }
        );


        /*
         * Persistent selection
         */

        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();


                /*
                 * Clicking selected variant
                 * deselects it.
                 */

                if (
                    selectedVariant &&
                    String(
                        selectedVariant.product_variation_id
                    ) ===
                    String(
                        variant.product_variation_id
                    )
                ) {

                    selectedVariant = null;

                }
                else {

                    selectedVariant =
                        variant;

                }


                hoveredVariant = null;


                updateCardInfo();


                if (cardActive) {

                    startCurrentCycle();

                }
                else {

                    showImage(
                        getProductImageSource(getActiveVariant())
                    );

                }

            }
        );


        return button;

    }


    /*
     * ------------------------------------------------------
     * INITIAL STATE
     * ------------------------------------------------------
     */

    updateCardInfo();


    showImage(
        getProductImageSource(getBaseVariant())
    );


    /*
     * ------------------------------------------------------
     * CARD HOVER
     * ------------------------------------------------------
     */

    card.addEventListener(
        "mouseenter",
        () => {

            startCurrentCycle();

        }
    );


    card.addEventListener(
        "mouseleave",
        () => {

            stopCurrentCycle();

        }
    );


    /*
     * ------------------------------------------------------
     * CARD KEYBOARD FOCUS
     * ------------------------------------------------------
     */

    card.addEventListener(
        "focus",
        () => {

            startCurrentCycle();

        }
    );


    card.addEventListener(
        "blur",
        () => {

            /*
             * Don't stop if focus is moving
             * into a variant button.
             */

            requestAnimationFrame(() => {

                if (!card.contains(
                    document.activeElement
                )) {

                    stopCurrentCycle();

                }

            });

        }
    );


    /*
     * ------------------------------------------------------
     * CARD CLICK
     * ------------------------------------------------------
     */

    card.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    ".product-card__variant"
                )
            ) {
                return;
            }


            if (
                event.target.closest(
                    ".product-card__more"
                )
            ) {
                return;
            }


            openProductDetail(
                product,
                selectedVariant || getBaseVariant()
            );

        }
    );


    return card;

}

function moveFeaturedSlider(direction) {
    const slider = document.getElementById("featured-product-slider");
    const viewport = slider?.querySelector(".product-slider__viewport");
    const grid = document.getElementById("featured-product-grid");
    const firstCard = grid?.querySelector(".product-card");

    if (!slider || !viewport || !grid || !firstCard) {
        return;
    }

    const gap = Number.parseFloat(getComputedStyle(grid).gap) || 0;
    const step = firstCard.offsetWidth + gap;
    const maxOffset = Math.max(0, grid.scrollWidth - viewport.clientWidth);
    const currentOffset = Number(slider.dataset.offset) || 0;

    slider.dataset.offset = String(
        Math.max(0, Math.min(currentOffset + (direction * step), maxOffset))
    );

    updateFeaturedSlider();
}

function keepProductTooltipInViewport(trigger) {
    const tooltip = trigger.querySelector(
        ".product-card__variant-tooltip, .product-card__more-tooltip"
    );
    const viewport = document.querySelector(".product-slider__viewport");

    if (!tooltip || !viewport) {
        return;
    }

    tooltip.style.setProperty("--tooltip-offset", "0px");

    const tooltipBounds = tooltip.getBoundingClientRect();
    const viewportBounds = viewport.getBoundingClientRect();
    const edgePadding = 8;
    let offset = 0;

    if (tooltipBounds.left < viewportBounds.left + edgePadding) {
        offset = viewportBounds.left + edgePadding - tooltipBounds.left;
    }
    else if (tooltipBounds.right > viewportBounds.right - edgePadding) {
        offset = viewportBounds.right - edgePadding - tooltipBounds.right;
    }

    tooltip.style.setProperty("--tooltip-offset", `${offset}px`);
}

function updateFeaturedSlider() {
    const slider = document.getElementById("featured-product-slider");
    const viewport = slider?.querySelector(".product-slider__viewport");
    const grid = document.getElementById("featured-product-grid");

    if (!slider || !viewport || !grid) {
        return;
    }

    const prevButton = slider.querySelector(".product-slider__arrow--prev");
    const nextButton = slider.querySelector(".product-slider__arrow--next");

    const isOverflowing = grid.scrollWidth > viewport.clientWidth + 1;

    const maxOffset = Math.max(0, grid.scrollWidth - viewport.clientWidth);
    let offset = Math.min(Number(slider.dataset.offset) || 0, maxOffset);

    slider.classList.toggle("is-overflowing", isOverflowing);
    slider.classList.toggle("has-previous", isOverflowing && offset > 0);
    slider.classList.toggle("has-next", isOverflowing && offset < maxOffset);
    grid.style.justifyContent = isOverflowing ? "flex-start" : "center";

    function setOffset(nextOffset) {

        offset = Math.max(0, Math.min(nextOffset, maxOffset));
        slider.dataset.offset = String(offset);
        grid.style.transform = `translateX(${-offset}px)`;

        prevButton.disabled = offset === 0;
        nextButton.disabled = offset >= maxOffset;
        prevButton.hidden = prevButton.disabled;
        nextButton.hidden = nextButton.disabled;

    }

    if (!slider.dataset.sliderBound) {
        prevButton.addEventListener("click", () => moveFeaturedSlider(-1));
        nextButton.addEventListener("click", () => moveFeaturedSlider(1));
        slider.dataset.sliderBound = "true";

    }

    if (isOverflowing) {
        prevButton.style.display = "flex";
        nextButton.style.display = "flex";
        setOffset(offset);
    } else {
        prevButton.style.display = "none";
        nextButton.style.display = "none";

        // Make sure the cards return to the centered position.
        setOffset(0);
    }
}

/* ---------------------------------------------------------
   FEATURED PRODUCTS
   --------------------------------------------------------- */
function renderFeaturedProducts() {
    const section = document.getElementById("featured-section");
    const grid = document.getElementById("featured-product-grid");
    const featuredProducts = siteData?.information?.featured_products;

    if (!section || !grid) {
        return;
    }

    section.hidden = !Array.isArray(featuredProducts) || featuredProducts.length === 0;

    if (section.hidden) {
        grid.innerHTML = "";
        return;
    }

    grid.innerHTML = "";

    featuredProducts.forEach(reference => {
        const cardData = resolveProductReference(reference);

        if (!cardData) {
            return;
        }

        const card = createProductCard(cardData);

        grid.appendChild(card);
    });

    requestAnimationFrame(() => {
        updateFeaturedSlider();
    });
}

function updateProductsGrid() {
    const grid = document.getElementById("products-grid");

    if (!grid || grid.childElementCount === 0) {
        return;
    }

    const cardCount = grid.childElementCount;
    const cardFootprint = window.innerWidth <= 767 ? 205 : 220;
    const availableColumns = Math.max(
        1,
        Math.floor((grid.clientWidth + 20) / cardFootprint)
    );
    let columns = Math.min(cardCount, availableColumns);

    if (cardCount > availableColumns && cardCount <= availableColumns * 2) {
        columns = Math.ceil(cardCount / 2);
    }

    grid.style.setProperty("--products-columns", columns);

    const hasSingleCardRow = cardCount % columns === 1;

    grid.querySelectorAll(".product-card").forEach((card, index) => {
        const isOnlyCardInRow = columns === 1 ||
            (hasSingleCardRow && index === cardCount - 1);

        card.classList.toggle("is-full-row", isOnlyCardInRow);
    });
}

function renderAllProducts() {
    const grid = document.getElementById("products-grid");
    const products = sortProducts(siteData?.products || []);

    if (!grid) {
        return;
    }

    grid.innerHTML = "";

    products.forEach(product => {
        const variants = sortProductVariants(product.variants || []);

        if (variants.length === 0) {
            return;
        }

        grid.appendChild(createProductCard({
            product,
            variants,
            specificVariant: false
        }));
    });

    requestAnimationFrame(updateProductsGrid);
}


function initializeProducts() {

    renderFeaturedProducts();
    renderAllProducts();

}

/* =========================================================
   ON-SCROLL REVEALS
   ========================================================= */
function initializeScrollReveals() {

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealGroups = [
        { selector: ".featured__title", effect: "scroll-reveal--up" },
        { selector: ".product-slider", effect: "scroll-reveal--up", delay: 80 },
        { selector: ".about-section__inner > .about-section__eyebrow", effect: "scroll-reveal--up" },
        { selector: ".about-section__media", effect: "scroll-reveal--left", delay: 90 },
        { selector: ".about-section__title, .about-section__story, .about-section__actions", effect: "scroll-reveal--right", stagger: 90 },
        { selector: ".about-section__partners > .about-section__eyebrow", effect: "scroll-reveal--up" },
        { selector: ".partner-link", effect: "scroll-reveal--up", stagger: 80 },
        { selector: ".products-section__eyebrow, .products-section__title", effect: "scroll-reveal--up", stagger: 90 },
        { selector: ".products-section__grid .product-card", effect: "scroll-reveal--up", stagger: 70 },
        { selector: ".order-section__map-wrap", effect: "scroll-reveal--left" },
        { selector: ".order-section__contact", effect: "scroll-reveal--right", delay: 100 }
    ];

    const elements = [];

    revealGroups.forEach(({ selector, effect, delay = 0, stagger = 0 }) => {
        document.querySelectorAll(selector).forEach((element, index) => {
            if (element.classList.contains("scroll-reveal")) {
                return;
            }

            element.classList.add("scroll-reveal");
            if (effect && effect !== "scroll-reveal--up") {
                element.classList.add(effect);
            }
            element.style.setProperty("--reveal-delay", `${delay + (index * stagger)}ms`);
            elements.push(element);
        });
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
        elements.forEach(element => element.classList.add("is-revealed"));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.12,
        rootMargin: "0px 0px -6%"
    });

    elements.forEach(element => observer.observe(element));
}



/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeWebsite() {

    updateDeviceClass();

    renderPromoBanner();

    updateScrollOffset();

    initializeHeader();

    initializeAbout();

    initializeOrderSection();

    initializeProducts();
}


/* =========================================================
   START
   ========================================================= */

loadSiteData();

window.addEventListener("resize", () => {

    updateDeviceClass();
    updateScrollOffset();
    updateFeaturedSlider();
    updatePartnerLayout();
    updateProductsGrid();
});
