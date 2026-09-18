import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("shows the authentication welcome screen", () => {
    render(<App />);
    expect(screen.getByText(/Nature intelligence/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /explore demo/i }),
    ).toBeInTheDocument();
  });
});
