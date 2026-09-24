export function EditorialScene({ src, alt, caption }) {
  return (
    <figure className="technical-editorial-hero__media" data-editorial-scene="true">
      <img
        alt={alt}
        className="editorial-scene__image"
        decoding="async"
        fetchPriority="high"
        height="640"
        loading="eager"
        src={src}
        width="960"
      />
      <figcaption className="technical-editorial-hero__caption">{caption}</figcaption>
    </figure>
  );
}
