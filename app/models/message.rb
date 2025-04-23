class Message < ApplicationRecord
  belongs_to :chat_thread
  validates :prompt, presence: true
  validates :response, presence: true
end
