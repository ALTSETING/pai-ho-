# Board geometry

The authoritative engine and SVG share a `0 0 1000 1000` coordinate space,
centred at `(500, 500)`. A cell ID is always the canonical `column,row` pair;
it never contains browser pixels or a player's viewing perspective.

With `GRID_STEP = 64` and `h = GRID_STEP / 2`, both applications use:

```text
centerX = 500 + (column - row) * h
centerY = 500 + (column + row) * h
```

The cell is the diamond with vertices `(centerX, centerY - h)`,
`(centerX + h, centerY)`, `(centerX, centerY + h)`, and
`(centerX - h, centerY)`. A cell is playable when all four vertices are within
the board circle of radius 455. Cell creation is idempotent.

## Rotation and player perspective

A canonical 180-degree cell rotation is `(-column,-row)`. The server always
stores canonical coordinates. The guest sees canonical points; the host sees
each point through `(viewX,viewY) = (1000-x,1000-y)`, putting each player's own
formation at the bottom without rotating tile artwork or changing click IDs.

## Initial host formation

| Piece | cellId | centre |
|---|---:|---:|
| Lotus | `-6,-6` | 500,116 |
| Air | `-6,-5` | 468,148 |
| Earth | `-5,-6` | 532,148 |
| Water | `-6,-4` | 436,180 |
| Fire | `-4,-6` | 564,180 |
| Earth | `-6,-3` | 404,212 |
| Air | `-3,-6` | 596,212 |
| Water | `-7,-1` | 308,244 |
| Fire | `-6,-2` | 372,244 |
| Avatar | `-4,-4` | 500,244 |
| Water | `-2,-6` | 628,244 |
| Fire | `-1,-7` | 692,244 |
| Air | `-5,-2` | 404,276 |
| Earth | `-2,-5` | 596,276 |

The guest formation is the exact canonical 180-degree rotation of these cells.
