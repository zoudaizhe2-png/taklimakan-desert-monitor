import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SearchFilterBar from "../components/SearchFilterBar";

vi.mock("../i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (key) => key, language: "en" }),
}));

vi.mock("../components/MapMarkerIcons", () => ({
  getCategoryColor: () => "#91cf60",
}));

vi.mock("react-icons/fi", () => ({
  FiSearch: (props) => <span data-testid="search-icon" {...props} />,
}));

describe("SearchFilterBar", () => {
  const defaultProps = {
    activeFilters: new Set(["vegetation", "desert", "city", "project", "water"]),
    onToggleFilter: vi.fn(),
    searchQuery: "",
    onSearchChange: vi.fn(),
  };

  it("renders all 5 category filter chips", () => {
    render(<SearchFilterBar {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(5);
  });

  it("calls onToggleFilter when a chip is clicked", () => {
    const onToggle = vi.fn();
    render(<SearchFilterBar {...defaultProps} onToggleFilter={onToggle} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // vegetation
    expect(onToggle).toHaveBeenCalledWith("vegetation");
  });

  it("calls onSearchChange when typing in search input", () => {
    const onSearch = vi.fn();
    render(<SearchFilterBar {...defaultProps} onSearchChange={onSearch} />);
    const input = screen.getByPlaceholderText("searchPlaceholder");
    fireEvent.change(input, { target: { value: "Hotan" } });
    expect(onSearch).toHaveBeenCalledWith("Hotan");
  });

  it("marks active filters visually", () => {
    const filters = new Set(["vegetation"]);
    render(<SearchFilterBar {...defaultProps} activeFilters={filters} />);
    const buttons = screen.getAllByRole("button");
    const activeButton = buttons.find((b) => b.classList.contains("active"));
    expect(activeButton).toBeTruthy();
  });
});
