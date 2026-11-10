/// What an operation that can fail returns, instead of throwing: either its
/// value or a message that is safe to show (never transcript text or audio).
sealed class Result<T> {
  const Result();

  /// The value, or null on failure.
  T? get valueOrNull => switch (this) {
    Ok<T>(:final value) => value,
    Err<T>() => null,
  };
}

final class Ok<T> extends Result<T> {
  const Ok(this.value);

  final T value;
}

final class Err<T> extends Result<T> {
  const Err(this.message);

  final String message;
}
