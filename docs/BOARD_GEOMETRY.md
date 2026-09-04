# Board geometry

The authoritative board and the SVG use one `0 0 1000 1000` coordinate space.
The centre is `(500, 500)`, cells are 68 units wide and 50 units tall, and a
piece has a 40-unit diameter. A cell ID is always `column,row`; it is not a
browser-pixel position.

For a logical `(row, column)` pair the shared mapping is:

```text
centerX = 500 + column * 68 + (abs(row) % 2 ? 34 : 0)
centerY = 500 + row * 50 + (row < 0 ? -15 : row > 0 ? 15 : 0)
```

The four polygon vertices are `(centerX, centerY - 25)`,
`(centerX + 34, centerY)`, `(centerX, centerY + 25)`, and
`(centerX - 34, centerY)`. Thus the complete mapping is
`cellId -> row/column -> centerX/centerY -> polygonPoints`.

## Initial host formation

| Piece | cellId | row | column | centre |
|---|---:|---:|---:|---:|
| Lotus | `0,-8` | -8 | 0 | 500, 85 |
| Air | `-1,-7` | -7 | -1 | 466, 135 |
| Earth | `0,-7` | -7 | 0 | 534, 135 |
| Water | `-1,-6` | -6 | -1 | 432, 185 |
| Fire | `1,-6` | -6 | 1 | 568, 185 |
| Earth | `-1,-5` | -5 | -1 | 466, 235 |
| Air | `0,-5` | -5 | 0 | 534, 235 |
| Water | `-2,-4` | -4 | -2 | 364, 285 |
| Fire | `-1,-4` | -4 | -1 | 432, 285 |
| Avatar | `0,-4` | -4 | 0 | 500, 285 |
| Water | `1,-4` | -4 | 1 | 568, 285 |
| Fire | `2,-4` | -4 | 2 | 636, 285 |
| Air | `-1,-3` | -3 | -1 | 466, 335 |
| Earth | `0,-3` | -3 | 0 | 534, 335 |

The guest formation uses the actual lattice cell reached by rotating every
centre 180 degrees around `(500, 500)`. No visual offset is applied to pieces.
