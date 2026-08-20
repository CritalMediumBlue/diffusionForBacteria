"""
.. include:: README.md
"""

from collections.abc import Iterable
from typing import Callable, TypeGuard, Self
from functools import wraps, partial
import re


type Rule[T] = Callable[[T], list[str] | None]
type MatchRule = Rule[re.Match[str]]
type StrRule = Rule[str]
type VoidRule = Callable[[], list[str] | None]


type RuleMethod[T, S] = Callable[[T, S], list[str] | None]

_rule_creation_counter: int = 0


class MethodRule[T]:
    # _rule_creation_counter: int = 0

    def __init__(self, rule: RuleMethod[T, str]):
        global _rule_creation_counter
        self.order: int = _rule_creation_counter
        _rule_creation_counter += 1
        self.rule: RuleMethod[T, str] = rule
        self.__doc__ = rule.__doc__

    def bind(self, other: T) -> StrRule:
        return lambda s: self.rule(other, s)


def match_filter(
    expr: str, handler: MatchRule, inp: str
) -> list[str] | None:
    if m := re.match(expr, inp):
        return handler(m)
    return None


type MatchMethodDecorator[T] = Callable[[RuleMethod[T, re.Match[str]]], MethodRule[T]]

def on_match_method[T](expr: str) -> MatchMethodDecorator[T]:
    def _decorator(f: RuleMethod[T, re.Match[str]]) -> MethodRule[T]:
        def _decorated(self: T, line: str) -> list[str] | None:
            return match_filter(expr, partial(f, self), line)

        return MethodRule(_decorated)
    return _decorator


type MatchFunctionDecorator = Callable[[MatchRule], StrRule]

def on_match_function(expr: str) -> MatchFunctionDecorator:
    def _decorator(f: MatchRule) -> StrRule:
        return wraps(f)(partial(match_filter, expr, f))
    return _decorator


def is_method[T, S](f: Rule[S] | RuleMethod[T, S]) -> TypeGuard[RuleMethod[T, S]]:
    return len(f.__qualname__.split(".")) > 1


def is_function[T, S](f: Rule[S] | RuleMethod[T, S]) -> TypeGuard[Rule[S]]:
    return not is_method(f)


def on_match[T](expr: str) -> Callable[[Rule[re.Match[str]] | RuleMethod[T, re.Match[str]]], StrRule | MethodRule[T]]:
    """Decorator for doing search-and-replace based on a given regex.

    The inner function should take as argument a `re.Match` object
    and return a list of strings. The resulting decorated function
    then becomes a function from string to list of strings.

    If the input doesn't match the given regex, the original string
    is returned.

    The inner function may still decide to do nothing by returning None.

    To erase the matched input return the empty list.

    This decorator also works on class methods. It is then assumed that
    the method has signature `(self, m: re.Match)`.
    """

    def _decorator(f: MatchRule | RuleMethod[T, re.Match[str]]):
        if is_method(f):
            return on_match_method(expr)(f)
        elif is_function(f):
            return on_match_function(expr)(f)
        else:
            raise TypeError("Impossible code path")

    return _decorator


def always[T](f: StrRule | RuleMethod[T, str]) -> StrRule | MethodRule[T]:
    """Suppose you have a rule with `@on_match(r".*")`, then it is better
    not to run the regex machinery at all and just pass on the string.
    In that case it is better to use `@always`."""
    if is_method(f):
        return MethodRule(f)
    elif is_function(f):
        return f
    else:
        raise TypeError("impossible code path")


def run(
    rules: list[StrRule],
    inp: str,
    exclusive: bool = True,
    on_begin: VoidRule | None = None,
    on_eof: VoidRule | None = None) -> str:
    """Takes a list of rules, being function from `str` to `list[str]`.
    The input string is split into lines, after which each line is fed
    through the list of rules. All the results are colected into a list
    of strings and then joined by newline.
    """
    lines = inp.splitlines()
    result: list[str] = []

    if on_begin:
        result.extend(on_begin() or [])

    for line in lines:
        for r in rules:
            v = r(line)
            if v is not None:
                result.extend(v)
                if exclusive:
                    break
        else:
            result.append(line)

    if on_eof:
        result.extend(on_eof() or [])

    return "\n".join(result)


class RuleSet:
    """To be used as a base class for classes that contain `on_match`
    decorated methods."""

    @classmethod
    def list_rules(cls: type[Self]) -> Iterable[MethodRule[Self]]:
        members = (getattr(cls, m) for m in dir(cls) if m[0] != "_")
        rules = filter(lambda m: isinstance(m, MethodRule), members)
        return sorted(rules, key=lambda r: r.order)

    def on_begin(self) -> list[str]:
        """This method gets called at the start of a scan."""
        return []

    def on_eof(self) -> list[str]:
        """This method gets called at the end of a scan."""
        return []

    def run(self, inp: str, exclusive: bool = True) -> str:
        """Runs all rules in the class on input."""
        rules: list[StrRule] = [r.bind(self) for r in self.list_rules()]
        return run(rules, inp, exclusive, on_begin=self.on_begin, on_eof=self.on_eof)
