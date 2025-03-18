export enum LeaderboardCategory {
    MOST_VALUE_SENT = 'most_value_sent',          // Most tokens sent by value
    MOST_TRANSACTIONS = 'most_transactions',      // Most transactions count
    HIGHEST_AVERAGE_VALUE = 'highest_average',    // Highest average value per transaction
    MOST_RECIPIENTS = 'most_recipients',          // Sent to most unique recipients
    MOST_TOKENS = 'most_tokens',                  // Most tokens by count (not value)
    STREAK = 'streak'                             // Longest streak of daily transactions
  }