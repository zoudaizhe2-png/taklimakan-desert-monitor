import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Sidebar from "../components/Sidebar";

// Mock LanguageContext
vi.mock("../i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (key) => key, lang: "en" }),
}));

// Mock icons
vi.mock("react-icons/fi", () => {
  const Icon = (props) => <span data-testid="icon" {...props} />;
  return {
    FiMap: Icon, FiActivity: Icon, FiFolder: Icon, FiClock: Icon,
    FiHome: Icon, FiGift: Icon, FiGlobe: Icon, FiFileText: Icon,
    FiSun: Icon, FiCompass: Icon,
  };
});
vi.mock("../components/icons/SnakeIcon", () => ({
  default: (props) => <span data-testid="snake-icon" {...props} />,
}));

describe("Sidebar", () => {
  it("renders all navigation items", () => {
    render(<Sidebar activeView="home" onViewChange={() => {}} />);
    // Main views: home, map, monitor, projects, research, playground, snake
    // Secondary: donate, timeline, news
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(10);
  });

  it("marks the active view", () => {
    render(<Sidebar activeView="map" onViewChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    const mapButton = buttons.find((b) => b.classList.contains("active"));
    expect(mapButton).toBeTruthy();
  });

  it("calls onViewChange when a button is clicked", () => {
    const onChange = vi.fn();
    render(<Sidebar activeView="home" onViewChange={onChange} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // map button
    expect(onChange).toHaveBeenCalledWith("map");
  });
});
