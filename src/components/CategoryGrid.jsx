import { FiArrowUpRight, FiBox } from 'react-icons/fi'

function CategoryGrid({ categories, loading, error, onRetry, onSelectCategory }) {
  return (
    <section className="section page-container" id="categories">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A good place to start</p>
          <h2>Shop by category</h2>
        </div>
        <span className="section-aside">Find the things that feel like you.</span>
      </div>

      {loading ? (
        <div aria-label="Loading categories" className="category-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="category-skeleton skeleton" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="inline-state" role="alert">
          <p>{error}</p>
          <button className="text-button" onClick={onRetry} type="button">Try again</button>
        </div>
      ) : categories.length === 0 ? (
        <div className="empty-state compact-empty">
          <FiBox aria-hidden="true" />
          <p>Categories are on their way. Check back soon.</p>
        </div>
      ) : (
        <div className="category-grid">
          {categories.slice(0, 8).map((category, index) => (
            <button
              className={`category-card category-tone-${index % 4}`}
              key={category._id || category.slug}
              onClick={() => onSelectCategory(category)}
              type="button"
            >
              {category.image ? (
                <img alt="" className="category-image" loading="lazy" src={category.image} />
              ) : (
                <span aria-hidden="true" className="category-image-placeholder">
                  <span>{String(category.name || '?').slice(0, 1).toUpperCase()}</span>
                </span>
              )}
              <span className="category-card-copy">
                <strong>{category.name}</strong>
                <span>{category.description || 'Explore the collection'}</span>
              </span>
              <span aria-hidden="true" className="category-arrow"><FiArrowUpRight /></span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default CategoryGrid
