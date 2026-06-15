# Project media — drop-in system (no HTML edits needed)

Each project card already points at a file in this folder. To add an image or
video to a card, just **drop a file here with the matching name**. If no file
exists, the card automatically shows a placeholder icon instead — nothing breaks.

## Filenames the cards look for

| Project                              | Drop a file named            |
|--------------------------------------|------------------------------|
| Open-Vocab Mobile Manipulation       | `hsr-ovmm.jpg`               |
| Geospatial LiDAR Pipeline            | `moro-lidar.jpg`             |
| casualSfM                            | `casualsfm.jpg`              |
| EKF SLAM                             | `ekf-slam.jpg`               |
| BallBot                              | `ballbot.jpg`                |
| UR5e IK in MuJoCo                    | `ur5e-ik.jpg`                |
| TurtleBot3 Remote (projects page)    | `turtlebot3-remote.jpg`      |

- Recommended size: **16:9**, roughly **800×450** or larger. `.jpg`, `.png`, and `.webp` all work.
- That's it — refresh the page and the image appears.

## Want a VIDEO instead of an image?

Swap the card's `<img>` line for a `<video>` in `index.html` / `projects.html`:

```html
<!-- replace this -->
<img src="assets/media/projects/ballbot.jpg" alt="" onerror="this.remove()">

<!-- with this -->
<video src="assets/media/projects/ballbot.mp4" autoplay muted loop playsinline></video>
```

Keep clips short (a few seconds), muted, and looping — they autoplay silently as a
preview. MP4 (H.264) is the safest format for browsers.
