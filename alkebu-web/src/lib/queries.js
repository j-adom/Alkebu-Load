
/*
    GROQ Queries
*/

export const GROQ_BOOK_COUNT = `
'bookCount': count(*[_type == 'book' 
    && defined(slug.current) 
    && !(_id in path("drafts.**"))
    && defaultBookVariant.price > 0
    ])
`

export const GROQ_FEATURED_BOOKS = `
'featured': *[_type == 'book' 
    && defined(slug.current) 
    && !(_id in path("drafts.**"))
    && defaultBookVariant.price > 0
    && defaultBookVariant.featured
    ] {
        ...,
        "images": defaultBookVariant.images[0].asset->url,
        authors[]->{name, slug},
        "price": defaultBookVariant.price,
        "binding": defaultBookVariant.binding,
        ...}[0..20]
`

export const GROQ_BOOK_GENRE = `
'genres': *[_type == 'genre' && keyGenre == true]{
    name, slug
}
`