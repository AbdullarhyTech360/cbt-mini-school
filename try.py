# Simple tkinter calculator using object-oriented programming

import tkinter as tk


class Calculator:
    def __init__(self, master):
        self.master = master
        self.master.title("Calculator")
        self.master.geometry("300x400")
        self.entry = tk.Entry(self.master, font=("Arial", 24))
        self.entry.pack(pady=10)
        self.buttons = []
        self.create_buttons()

    def create_buttons(self):
        button_texts = [
            "7",
            "8",
            "9",
            "/",
            "4",
            "5",
            "6",
            "*",
            "1",
            "2",
            "3",
            "-",
            "0",
            ".",
            "=",
            "+",
            "C",
        ]
        for text in button_texts:
            button = tk.Button(
                self.master,
                text=text,
                font=("Arial", 18),
                command=lambda t=text: self.on_button_click(t),
            )
            button.pack(side=tk.LEFT, padx=5, pady=5)
            self.buttons.append(button)

    def on_button_click(self, text):
        if text == "=":
            self.calculate()
        elif text == "C":
            self.clear()
        else:
            self.entry.insert(tk.END, text)

    def calculate(self):
        try:
            result = eval(self.entry.get())
            self.entry.delete(0, tk.END)
            self.entry.insert(tk.END, str(result))
        except Exception as e:
            print(e)
            self.entry.delete(0, tk.END)
            self.entry.insert(tk.END, "Error")

    def clear(self):
        self.entry.delete(0, tk.END)

    # start the app
