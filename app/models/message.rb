class Message < ApplicationRecord
  validates :prompt, presence: true
  validates :response, presence: true
end
