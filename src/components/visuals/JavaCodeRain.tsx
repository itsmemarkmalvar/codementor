"use client";

import React, { useEffect, useRef } from "react";

interface JavaCodeRainProps {
	width?: number;
	height?: number;
	className?: string;
	fontSize?: number; // px
	trailFade?: number; // 0..1 rectangle alpha for trails
	color?: string; // text color
	opacity?: number; // overall canvas opacity
}

/**
 * Canvas-based Matrix-style rain using characters sampled from Java code.
 * Performance-friendly: scales with DPR, throttles columns, uses alpha trails.
 */
export default function JavaCodeRain({
	width,
	height,
	className = "",
	fontSize = 14,
	trailFade = 0.08,
	color = "#6ee7b7", // emerald-300
	opacity = 0.12,
}: JavaCodeRainProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const rafRef = useRef<number | null>(null);
	const colsRef = useRef<number[]>([]);
	const sizeRef = useRef<{ w: number; h: number; dpr: number; font: number }>({ w: 0, h: 0, dpr: 1, font: fontSize });

	// Java character source pool (keywords, symbols, and snippet characters)
	const CHAR_SOURCE =
		"public static void class interface extends implements new return if else for while try catch finally boolean int double String System.out.println Arrays List Map HashMap ArrayList throws package import null true false { } ( ) [ ] ; , < > = + - * / % ! && || \" ' ." +
		" public class Main { public static void main(String[] args) { int[] a = {1,2,3}; for(int i=0;i<a.length;i++){ System.out.println(a[i]); } } }";

	useEffect(() => {
		const canvas = canvasRef.current!;
		if (!canvas) return;

		const ctx = canvas.getContext("2d", { alpha: true });
		if (!ctx) return;

		const setup = () => {
			const dpr = Math.min(2, (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1);
			const w = typeof width === "number" ? width : window.innerWidth;
			const h = typeof height === "number" ? height : window.innerHeight;
			const font = fontSize;

			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			ctx.font = `${font}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace`;

			const columns = Math.floor(w / (font * 0.9));
			colsRef.current = Array.from({ length: columns }, () => Math.floor(Math.random() * 50));
			sizeRef.current = { w, h, dpr, font };
		};

		setup();

		const draw = () => {
			const { w, h, font } = sizeRef.current;
			if (!ctx) return;

			// Semi-transparent rect for trail fade
			ctx.fillStyle = `rgba(0, 0, 0, ${trailFade})`;
			ctx.fillRect(0, 0, w, h);

			ctx.fillStyle = color;
			ctx.textBaseline = "top";

			const cols = colsRef.current;
			for (let i = 0; i < cols.length; i++) {
				const x = i * (font * 0.9);
				const y = cols[i] * font;
				const ch = CHAR_SOURCE.charAt(Math.floor(Math.random() * CHAR_SOURCE.length));
				ctx.fillText(ch, x, y);

				// Reset to top randomly after flowing beyond height
				if (y > h && Math.random() > 0.975) {
					cols[i] = 0;
				} else {
					// Variable speed: occasionally skip rows to create depth
					cols[i] += (Math.random() > 0.96 ? 2 : 1);
				}
			}

			rafRef.current = requestAnimationFrame(draw);
		};

		rafRef.current = requestAnimationFrame(draw);

		const onResize = () => {
			cancelAnimationFrame(rafRef.current || 0);
			setup();
			rafRef.current = requestAnimationFrame(draw);
		};

		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [width, height, fontSize, trailFade, color]);

	return (
		<canvas
			ref={canvasRef}
			className={className}
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: width ? `${width}px` : "100%",
				height: height ? `${height}px` : "100%",
				pointerEvents: "none",
				opacity,
			}}
		/>
	);
}


