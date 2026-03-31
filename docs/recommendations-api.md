# Recommendations API

Lightweight public JSON endpoint for distribution while pointing traffic back to canonical website URLs.

## Endpoint

`/api/recommendations?movie=interstellar`

## Example

`https://www.movieslike.app/api/recommendations?movie=interstellar`

## Notes

- Accepts movie slug or equivalent title input through `movie` query param.
- Returns `404` JSON when movie data is not found.
- All returned `source_url` and recommendation `url` values use canonical domain:
  `https://www.movieslike.app`.
