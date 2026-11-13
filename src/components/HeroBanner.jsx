import { FiArrowDownRight, FiArrowUpRight } from 'react-icons/fi'

function HeroBanner({ onShopClick }) {
  return (
    <section className="hero page-container" id="home">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-dot" /> A little more considered</p>
        <h1>Good things.<br /><span>Good feeling.</span></h1>
        <p className="hero-description">
          Everyday essentials and little luxuries, thoughtfully chosen to make
          life feel a bit more like you.
        </p>
        <button className="button button-dark" onClick={onShopClick} type="button">
          Explore the collection <FiArrowUpRight aria-hidden="true" />
        </button>
        <a className="hero-note" href="#categories">
          <FiArrowDownRight aria-hidden="true" />
          Find your next favorite
        </a>
        <div className="hero-social-proof" aria-label="A thoughtfully curated store">
          <span className="proof-star">✳</span>
          <span>Little details, big difference.</span>
        </div>
      </div>

      <div className="hero-art" role="img" aria-label="A sunlit, curated home and lifestyle collection">
        <div className="hero-image" />
        <div className="hero-art-wash" />
        <div className="hero-sticker">
          <span>THE EVERYDAY</span>
          <strong>edit</strong>
          <span>THE 2026 EDIT</span>
        </div>
        <div className="hero-caption">
          <span className="caption-line" />
          <span>Made for your kind of everyday</span>
        </div>
      </div>
    </section>
  )
}

export default HeroBanner
