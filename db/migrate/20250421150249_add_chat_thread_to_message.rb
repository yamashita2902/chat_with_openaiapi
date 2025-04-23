class AddChatThreadToMessage < ActiveRecord::Migration[7.1]
  def change
    add_reference :messages, :chat_thread, null: false, foreign_key: true
  end
end
