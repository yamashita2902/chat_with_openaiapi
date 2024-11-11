class CreateMessages < ActiveRecord::Migration[7.1]
  def change
    create_table :messages do |t|
      t.text :prompt
      t.text :response

      t.timestamps
    end
  end
end
