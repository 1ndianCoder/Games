# Duo Arcade

57 minimalist **2-player, same-device** games. Pure HTML/JS with no build step and no dependencies. Open `index.html` or host the folder on any static server (for example GitHub Pages).

## Features
- **Play a friend or a bot**: every game has a bot at Easy, Medium and Hard. Board games use real search (iterative-deepening alpha-beta, Monte-Carlo playouts, solved positions for Nim/Chomp/Tic Tac Toe), shot games simulate candidate shots in the physics, and real-time bots predict, intercept and make human-like mistakes.
- **Party Mode**: 5 random games back to back, with a running party score.
- **Random Game** button, category filters and search.
- A session score per game (rematch keeps the tally) and all-time win stats saved in the browser.
- Editable player names, sound effects (with mute), and screen shake.
- **Keyboard**: Player 1 uses `WASD` + `F`/`Space` (`G` = second button). Player 2 uses the arrow keys + `Enter`/`L` (`K`/`Right Shift` = second button).
- **Touch, no buttons**: drag anywhere on your half to get a floating analog stick, tap to act; paddle games follow your finger directly; one-button games are tap-your-half. On a phone held upright, wide games rotate to fill the screen (one player at each end).
- `Esc` or `P` pauses. `index.html#pong` deep-links straight to a game.
- Menu tiles are live previews: the real game, played by two bots.

## Games
| Sports (13) | Arcade (15) | Party (10) | Board (19) |
|---|---|---|---|
| Pong | Light Cycles | Quick Draw | Tic Tac Toe |
| Tennis | Snake Duel | Tug of War | Ultimate TTT |
| Blob Volley | Tank Duel | Stack Race | Four in a Row |
| Soccer | Star Duel | Rock Paper Scissors | Five in a Row |
| Air Hockey | Flap Off | Math Duel | Reversi |
| Mini Golf | Bomb Duel | Color Clash | Checkers |
| Hoops | Paint Wars | Echo (memory chain) | Dots & Boxes |
| Archery | Coin Rush | Pig Dice | Nim |
| Curling | Hot Potato | Time It | Hex |
| Penalty Kicks | King of the Hill | Snap! | Mancala |
| Pool | Meteor Dodge | | Sea Battle |
| Sumo | Brick Battle | | Memory Match |
| Racer | Gravity Flip | | Isolation |
| | Artillery | | Domineering |
| | Fencing | | Breakthrough |
| | | | Sim |
| | | | Capture Go |
| | | | Mine Flags |
| | | | Chomp |

## Adding a game
Each game is one `reg({...})` call in `js/*.js`:

```js
reg({
  id: 'mygame', name: 'My Game', cat: 'Arcade', icon: '🎮',
  type: 'real',          // 'real' = live keyboard/pad, 'turn' = tap/click
  pad: 'dpad a',         // touch pad: 'dpad' | 'ud' | 'lr' plus ' a' / ' b', or 'one'
  desc: 'Card blurb', help: 'Rules shown before play',
  make(A) {              // A: W,H,names,first,get(p,btn),hit(p,btn),axis(p),analog(p),point(p),end(winner,msg),turn(p),sfx(name),shake(px)
    return {
      update(dt) {}, draw(c) {}, down(x, y) {}, move(x, y) {}, up(x, y) {},
      ai(dt, B) {},        // real-time bot: steer with B.go(x,y), B.press('a'), B.hold(b), B.dir(k); difficulty via B.k(easy, med, hard)
      // turn-based games instead use ai(bot) { ...make one move...; return true; }
    };
  }
});
```
Call `A.end(0 | 1 | -1)` to finish a round. The engine handles the overlays, score, stats, countdown and Party Mode.
