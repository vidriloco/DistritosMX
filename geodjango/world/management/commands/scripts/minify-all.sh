current_dir="$(pwd)/world/static/js"

uglifyjs $current_dir/shared.js $current_dir/boot_now.js --output $current_dir/all_now.min.js
uglifyjs $current_dir/shared.js $current_dir/boot_past.js --output $current_dir/all_past.min.js
uglifyjs $current_dir/shared.js $current_dir/boot_future.js --output $current_dir/all_future.min.js
uglifyjs $current_dir/shared.js $current_dir/boot_multiverse.js --output $current_dir/all_multiverse.min.js
uglifyjs $current_dir/shared.js $current_dir/boot_politics.js --output $current_dir/all_politics.min.js
uglifyjs $current_dir/community/shared.js $current_dir/community/map_controller.js $current_dir/community/helpers.js --output $current_dir/community/show.min.js
uglifyjs $current_dir/community/shared.js $current_dir/community/helpers.js --output $current_dir/community/other.min.js