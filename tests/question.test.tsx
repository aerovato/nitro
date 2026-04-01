import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "ink-testing-library";
import { AskPrompt } from "../src/components/ask/AskPrompt";
import { pressArrow, pressEnter, waitForText, waitFor } from "./utils";
import type { AskUserModelInput } from "../src/tools";

const singleQuestionModelInput: AskUserModelInput = {
  questions: [
    {
      title: "Color",
      question: "Pick a color",
      choices: [
        { label: "Red", description: "The color red" },
        { label: "Blue", description: "The color blue" },
      ],
    },
  ],
};

const twoQuestionsModelInput: AskUserModelInput = {
  questions: [
    {
      title: "Fruit",
      question: "Pick a fruit",
      choices: [{ label: "Apple" }, { label: "Banana" }],
    },
    {
      title: "Season",
      question: "Pick a season",
      choices: [{ label: "Summer" }, { label: "Winter" }],
    },
  ],
};

describe("AskPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders question title and choices", () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(
      <AskPrompt modelInput={singleQuestionModelInput} onSubmit={onSubmit} />,
    );
    const output = lastFrame();
    expect(output).toContain("Color");
    expect(output).toContain("Pick a color");
    expect(output).toContain("Red");
    expect(output).toContain("Blue");
  });

  it("submits when first choice is selected", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <AskPrompt modelInput={singleQuestionModelInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Red");
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      answers: [{ question: "Pick a color", answer: "Red" }],
    });
  });

  it("submits second choice after arrow down", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <AskPrompt modelInput={singleQuestionModelInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Blue");
    pressArrow(stdin, "down");
    await new Promise(r => setTimeout(r, 50));
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      answers: [{ question: "Pick a color", answer: "Blue" }],
    });
  });

  it("allows custom text answer", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <AskPrompt modelInput={singleQuestionModelInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Red");
    pressArrow(stdin, "down");
    await new Promise(r => setTimeout(r, 50));
    pressArrow(stdin, "down");
    await new Promise(r => setTimeout(r, 50));
    pressEnter(stdin);
    await new Promise(r => setTimeout(r, 50));
    stdin.write("Green");
    await new Promise(r => setTimeout(r, 50));
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      answers: [{ question: "Pick a color", answer: "Green" }],
    });
  });

  it("renders question counter for multiple questions", () => {
    const onSubmit = vi.fn();
    const { lastFrame } = render(
      <AskPrompt modelInput={twoQuestionsModelInput} onSubmit={onSubmit} />,
    );
    const output = lastFrame();
    expect(output).toContain("Question 1 of 2");
  });

  it("navigates between questions after answering", async () => {
    const onSubmit = vi.fn();
    const { lastFrame, stdin } = render(
      <AskPrompt modelInput={twoQuestionsModelInput} onSubmit={onSubmit} />,
    );
    await waitForText(lastFrame, "Fruit");
    pressEnter(stdin);
    await new Promise(r => setTimeout(r, 100));
    pressEnter(stdin);
    await waitFor(() => onSubmit.mock.calls.length > 0);
    expect(onSubmit).toHaveBeenCalledWith({
      answers: [
        { question: "Pick a fruit", answer: "Apple" },
        { question: "Pick a season", answer: "Summer" },
      ],
    });
  });
});
