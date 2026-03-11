"use client";

import { useState, useEffect } from "react";
import Carousel3D from "../components/Carousel3D";

const ROLES = [
  "Architects.",
  "Designers.",
  "Retail Planners.",
  "Innovators.",
  "Creators."
];

export default function Home() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Fetch data 
    fetch('/api/portfolio')
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.error(err));
  }, []);

  if (items.length === 0) return null;

  return (
    <Carousel3D items={items} />
  );
}
