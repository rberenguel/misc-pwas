# Entrellat

A spatial reasoning game about axis projection.

A 3D wireframe shape sits at the center of the screen, slowly rotating. The shape is a maze etched onto three faces of a cube meeting at a corner. The maze pattern cycles between two states every second.

Your task: identify which of the four 2D options matches what you'd see if you looked straight at one specific face of the cube. The answer is the flat projection of that face — what you'd see staring directly at it from the outside (or inside).

## How to play

- Watch the rotating 3D cube
- Pick the 2D panel that matches the face being asked about
- Correct: score goes up. Wrong: score goes down (min 0)
- Tap any card after answering to skip to the next round

## Stack

Vanilla JS + Three.js (r128) for WebGL rendering. No build step. Works as a PWA.
