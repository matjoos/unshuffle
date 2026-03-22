# Unshuffle

Rebuild LEGO sets from a mixed pile of bricks, sorted by color.

Parents with multiple LEGO sets mixed together know the pain: hundreds of pieces in a big bin, no idea which brick goes where. Unshuffle gives you a **color-first picking workflow** across all your sets at once.

## How it works

1. **Enter set numbers** — add the LEGO sets you want to rebuild
2. **Fetch inventories** — parts data comes from the [Rebrickable API](https://rebrickable.com/api/) (free, requires an API key)
3. **Pick a color** — grab a bag/pile of one color and tap it
4. **Sort parts** — the app shows every piece of that color across all your sets, with images and quantities. Tap +Found or +Missing as you go
5. **Export missing parts** — when you're done, download a BrickLink XML or CSV of everything you couldn't find

Your progress is saved in your browser (localStorage), so you can close the tab and come back later.

## Getting started

```bash
npm install
npm run dev
```

You'll need a free Rebrickable API key from [rebrickable.com/api](https://rebrickable.com/api/).

## License

[AGPL-3.0](LICENSE) — free to use, modify, and distribute, but if you run a modified version as a service, you must share your source code.

## Credits

- Parts data and images from [Rebrickable](https://rebrickable.com/)
- Built with [React](https://react.dev/) and [Vite](https://vite.dev/)
