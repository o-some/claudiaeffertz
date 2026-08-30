from pathlib import Path


ROOT = Path(__file__).parent
PAGES = ["index.html", "impressum.html", "datenschutz.html", "agb.html", "widerruf.html"]


def main() -> None:
    script = (ROOT / "script.js").read_text(encoding="utf-8")
    styles = (ROOT / "styles.css").read_text(encoding="utf-8")
    assert "const analyticsId = '';" in script
    assert "const analyticsConfigured =" in script
    assert "if (analyticsConfigured)" in script
    assert "https://www.googletagmanager.com/gtag/js?id=" in script
    assert ".legal-layout > *, .legal-content section { min-width: 0; }" in styles
    assert "overflow-wrap: anywhere; hyphens: auto;" in styles

    for name in PAGES:
        html = (ROOT / name).read_text(encoding="utf-8")
        assert 'src="https://www.googletagmanager.com' not in html
        assert "data-consent-settings" in html
        assert 'href="agb.html"' in html
        assert 'href="widerruf.html"' in html

    print("Rechtstexte und Analytics-Consent-Gate: OK")


if __name__ == "__main__":
    main()
