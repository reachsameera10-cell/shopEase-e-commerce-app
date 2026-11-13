import { FiArrowUpRight } from 'react-icons/fi'
import { Link, useLocation } from 'react-router-dom'

function SiteFooter() {
  const { pathname } = useLocation()
  const categoryHref = pathname === '/' ? '#categories' : '/products'
  const featuredHref = pathname === '/' ? '#featured' : '/products?sort=rating'
  const latestHref = pathname === '/' ? '#new-arrivals' : '/products?sort=newest'

  return (
    <footer className="site-footer" id="footer">
      <div className="footer-main page-container">
        <div className="footer-brand-block">
          <Link className="brand footer-brand" to="/">
            <span className="brand-mark">s.</span>
            <span>shopease</span>
          </Link>
          <p>Little things, thoughtfully found.<br />A better kind of everyday starts here.</p>
        </div>
        <div className="footer-links">
          <div>
            <span className="footer-label">Explore</span>
            <a href={categoryHref}>Categories</a>
            <a href={featuredHref}>Curated picks</a>
            <a href={latestHref}>New arrivals</a>
          </div>
          <div>
            <span className="footer-label">The good stuff</span>
            <a href={featuredHref}>Our point of view <FiArrowUpRight aria-hidden="true" /></a>
            <a href={latestHref}>Recently found <FiArrowUpRight aria-hidden="true" /></a>
          </div>
        </div>
      </div>
      <div className="footer-bottom page-container">
        <span>© {new Date().getFullYear()} ShopEase. Made for everyday.</span>
        <span>Thoughtfully picked, always.</span>
      </div>
    </footer>
  )
}

export default SiteFooter
